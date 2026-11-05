
DELETE FROM public.drip_sequences;

INSERT INTO public.drip_sequences (name, description, is_active, steps) VALUES (
  'Zero Pressure Playbook Outreach',
  'Genuine, no-pressure 6-email sequence. Every email gives value and offers a free personalized playbook. No calls, no meetings, no sales pressure.',
  true,
  '[
    {
      "delay_days": 0,
      "subject_template": "Something personal about their industry or business",
      "body_prompt": "Tell a brief personal story about a business similar to theirs that was drowning in complexity. Show empathy. Then mention you put together a free personalized playbook for their specific situation. No strings attached. They can grab it or not. Link to https://aetheris.technology/resources. Keep it genuine and warm."
    },
    {
      "delay_days": 3,
      "subject_template": "A quick insight relevant to their industry",
      "body_prompt": "Share one specific insight about something most businesses in their industry get wrong. Make it useful on its own. At the end, casually mention the playbook is still available if they want it. No pressure. No follow up request."
    },
    {
      "delay_days": 7,
      "subject_template": "Something specific you noticed about their business",
      "body_prompt": "Reference one concrete thing about their website or business that could be simpler or more effective. Show you actually looked. Offer a genuine observation, not a critique. Remind them the free playbook covers exactly this kind of thing. Still no strings."
    },
    {
      "delay_days": 12,
      "subject_template": "A short story they can relate to",
      "body_prompt": "Tell a brief story about how a business like theirs went from chaos to clarity. Not a case study pitch. Just a real story with a real outcome. Let them draw their own conclusions. Mention the playbook one more time naturally."
    },
    {
      "delay_days": 18,
      "subject_template": "Something useful they can apply today",
      "body_prompt": "Share a useful framework, resource, or approach they can apply to their business today without needing anyone else. Make the email itself valuable. Mention the playbook is still there if they want the full version."
    },
    {
      "delay_days": 25,
      "subject_template": "Genuine, warm closing",
      "body_prompt": "Genuine goodbye. Say something like if the timing is not right, no worries at all. Leave the playbook link one last time. Wish them well. No guilt. No pressure. Just a human being kind to another human."
    }
  ]'::jsonb
);
