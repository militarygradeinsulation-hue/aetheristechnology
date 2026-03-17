UPDATE blog_posts 
SET content = REPLACE(content, 'https://www.linkedin.com/company/aetheris-ai', 'https://www.linkedin.com/in/aisystemsarchitect')
WHERE content LIKE '%linkedin.com/company/aetheris-ai%';