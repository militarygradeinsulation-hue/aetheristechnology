ALTER TABLE public.lead_drip_settings
ADD COLUMN IF NOT EXISTS blocked_keywords text[] NOT NULL DEFAULT ARRAY[
  'school','schools','elementary','middle school','high school','k-12','k12',
  'university','college','academy','isd','school district','education department',
  'public schools','charter school','preschool','daycare','kindergarten',
  'student','tutoring','classroom','curriculum','pta','board of education'
];