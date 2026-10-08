import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    : null;

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithGemini(prompt, purpose = 'AI') {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `[${purpose}] Trying ${model} - attempt ${attempt}`
        );

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (!response || !response.text) {
          throw new Error('Gemini returned an empty response.');
        }

        console.log(`[${purpose}] Gemini succeeded: ${model}`);

        return response;
      } catch (error) {
        lastError = error;

        console.error(
          `[${purpose}] ${model} attempt ${attempt} failed:`,
          error?.message || error
        );

        if (attempt < 2) {
          console.log(`[${purpose}] Waiting 2 seconds before retry...`);
          await sleep(2000);
        }
      }
    }
  }

  console.error(`[${purpose}] All Gemini attempts failed.`, lastError);

  throw lastError || new Error('Gemini request failed.');
}

function buildEmailHtml(message) {
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return escapedMessage
    .split('\n')
    .map((line) => {
      if (!line.trim()) {
        return '<br />';
      }

      return `<p style="margin:0 0 12px 0;">${line}</p>`;
    })
    .join('');
}

async function sendEmail({ to, subject, message }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is missing.');
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is missing.');
  }

  const emailResult = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: [to],
    subject: subject || 'Following up on your enquiry',
    html: `
      <div style="
        font-family:Arial,sans-serif;
        line-height:1.6;
        color:#222;
        max-width:600px;
        margin:0 auto;
      ">
        ${buildEmailHtml(message)}
      </div>
    `,
  });

  if (emailResult.error) {
    throw new Error(
      emailResult.error.message || 'Failed to send email.'
    );
  }

  return emailResult.data?.id || null;
}

let schedulerRunning = false;

async function processScheduledFollowups() {
  if (schedulerRunning) {
    return;
  }

  if (!supabaseAdmin) {
    console.log(
      '[SCHEDULER] Supabase admin client is not configured.'
    );
    return;
  }

  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM_EMAIL
  ) {
    console.log('[SCHEDULER] Resend is not configured.');
    return;
  }

  schedulerRunning = true;

  try {
    const now = new Date().toISOString();

    const { data: scheduled, error } = await supabaseAdmin
      .from('scheduled_followups')
      .select(
        'id, user_id, lead_id, message, scheduled_for'
      )
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .order('scheduled_for', {
        ascending: true,
      })
      .limit(20);

    if (error) {
      console.error(
        '[SCHEDULER] Failed to load scheduled follow-ups:',
        error.message
      );

      return;
    }

    if (!scheduled || scheduled.length === 0) {
      return;
    }

    console.log(
      `[SCHEDULER] Found ${scheduled.length} follow-up(s) to process.`
    );

    for (const item of scheduled) {
      try {
        const { data: lead, error: leadError } =
          await supabaseAdmin
            .from('leads')
            .select('id, name, email')
            .eq('id', item.lead_id)
            .eq('user_id', item.user_id)
            .maybeSingle();

        if (leadError) {
          throw leadError;
        }

        if (!lead) {
          throw new Error('Lead not found.');
        }

        if (!lead.email) {
          throw new Error(
            'Lead does not have an email address.'
          );
        }

        const emailId = await sendEmail({
          to: lead.email,
          subject: 'Following up on your enquiry',
          message: item.message,
        });

        const sentAt = new Date().toISOString();

        const { error: updateError } =
          await supabaseAdmin
            .from('scheduled_followups')
            .update({
              status: 'sent',
              sent_at: sentAt,
            })
            .eq('id', item.id)
            .eq('status', 'scheduled');

        if (updateError) {
          throw updateError;
        }

        await supabaseAdmin
          .from('leads')
          .update({
            status: 'Follow-up',
            last_activity: sentAt,
          })
          .eq('id', item.lead_id)
          .eq('user_id', item.user_id);

        console.log(
          `[SCHEDULER] Sent scheduled follow-up ${item.id} to ${lead.email}. Resend ID: ${emailId || 'n/a'}`
        );
      } catch (error) {
        console.error(
          `[SCHEDULER] Failed follow-up ${item.id}:`,
          error?.message || error
        );

        await supabaseAdmin
          .from('scheduled_followups')
          .update({
            status: 'failed',
          })
          .eq('id', item.id)
          .eq('status', 'scheduled');
      }
    }
  } finally {
    schedulerRunning = false;
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'LeadPilot AI',
  });
});

app.get('/api/leads', (req, res) => {
  res.json({
    leads: [],
  });
});

app.post('/api/ai/follow-up', async (req, res) => {
  try {
    const {
      name,
      business,
      requirement,
      budget,
      tone,
    } = req.body;

    if (!name || !requirement) {
      return res.status(400).json({
        success: false,
        error:
          'Lead name and requirement are required.',
      });
    }

    const prompt = `
You are an AI sales assistant for LeadPilot.

Create a short, natural and professional follow-up message
for this potential customer.

Lead information:

Name: ${name}
Business: ${business || 'Not provided'}
Requirement: ${requirement}
Budget: ${budget || 'Not provided'}
Tone: ${tone || 'Professional'}

Rules:

- Sound human, not robotic.
- Do not exaggerate.
- Do not mention that you are an AI.
- Keep the message under 100 words.
- Personalize the message using the lead information.
- Ask one simple question or call-to-action.
- Do not invent information that was not provided.
- Keep it suitable for a real sales follow-up.

Return ONLY the message that should be sent to the lead.
`;

    const response = await generateWithGemini(
      prompt,
      'FOLLOW-UP'
    );

    res.json({
      success: true,
      message: response.text.trim(),
    });
  } catch (error) {
    console.error(
      'AI follow-up final error:',
      error?.message || error
    );

    res.status(503).json({
      success: false,
      error:
        'AI service is temporarily busy. Please try again in a few seconds.',
    });
  }
});

app.post('/api/ai/qualify-lead', async (req, res) => {
  try {
    const {
      name,
      business,
      email,
      phone,
      requirement,
      budget,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Lead name is required.',
      });
    }

    const prompt = `
You are an AI sales qualification assistant for LeadPilot.

Analyze this potential customer and determine how likely
they are to become a customer.

Lead information:

Name: ${name}
Business: ${business || 'Not provided'}
Email: ${email || 'Not provided'}
Phone: ${phone || 'Not provided'}
Requirement: ${requirement || 'Not provided'}
Budget: ${budget || 'Not provided'}

Scoring rules:

- 80-100 = Hot
- 50-79 = Warm
- 0-49 = Cold

Consider:

- How specific the requirement is
- Buying intent
- Budget information
- Urgency
- Whether the lead appears ready to take action

Return ONLY valid JSON in exactly this format:

{
  "score": 85,
  "status": "Hot",
  "reason": "Short explanation of why this lead received this score."
}

Do not include markdown.
Do not include code fences.
Do not include any text outside the JSON.
`;

    const response = await generateWithGemini(
      prompt,
      'QUALIFICATION'
    );

    const rawText = response.text.trim();

    let result;

    try {
      const cleanedText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      result = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(
        'Failed to parse Gemini qualification:',
        rawText
      );

      return res.status(500).json({
        success: false,
        error:
          'AI returned an invalid qualification result.',
      });
    }

    const validStatuses = [
      'Hot',
      'Warm',
      'Cold',
    ];

    if (
      typeof result.score !== 'number' ||
      !validStatuses.includes(result.status) ||
      !result.reason
    ) {
      return res.status(500).json({
        success: false,
        error:
          'AI returned an invalid qualification result.',
      });
    }

    result.score = Math.max(
      0,
      Math.min(100, Math.round(result.score))
    );

    res.json({
      success: true,
      score: result.score,
      status: result.status,
      reason: result.reason,
    });
  } catch (error) {
    console.error(
      'AI qualification final error:',
      error?.message || error
    );

    res.status(503).json({
      success: false,
      error:
        'AI service is temporarily busy. Please try again in a few seconds.',
    });
  }
});

app.post('/api/email/send-follow-up', async (req, res) => {
  try {
    const {
      to,
      subject,
      message,
    } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email is required.',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Email message is required.',
      });
    }

    console.log(
      `Sending follow-up email to ${to}...`
    );

    const emailId = await sendEmail({
      to,
      subject,
      message,
    });

    console.log(
      'Email accepted by Resend:',
      emailId
    );

    return res.json({
      success: true,
      message: 'Email sent successfully.',
      emailId,
    });
  } catch (error) {
    console.error(
      'Send email final error:',
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        'Failed to send the follow-up email.',
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `LeadPilot API running on http://localhost:${PORT}`
  );

  console.log(
    '[SCHEDULER] Checking scheduled follow-ups every 60 seconds.'
  );

  processScheduledFollowups();

  setInterval(
    processScheduledFollowups,
    60 * 1000
  );
});