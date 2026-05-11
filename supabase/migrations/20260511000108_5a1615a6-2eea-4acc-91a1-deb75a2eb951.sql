UPDATE public.careers_questions
SET choices = '[{"id":"a","text":"$49"},{"id":"b","text":"$125"},{"id":"c","text":"$149"},{"id":"d","text":"$249"}]'::jsonb,
    correct_choice_id = 'c'
WHERE question = 'What is the Digital Snapshot price?';

UPDATE public.careers_questions
SET choices = '[{"id":"a","text":"$299"},{"id":"b","text":"$499"},{"id":"c","text":"$599"},{"id":"d","text":"$999"}]'::jsonb,
    correct_choice_id = 'c'
WHERE question = 'What is the Website Evaluation price?';