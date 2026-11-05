DELETE FROM drip_emails WHERE prospect_id IN (SELECT id FROM drip_prospects WHERE email = '');
DELETE FROM drip_prospects WHERE email = '';