UPDATE public.leadership_roles SET display_name='Braden', title='Chief Operating Officer' WHERE role_slug='coo';
UPDATE public.leadership_roles SET display_name='Dean', title='Chief of Sales' WHERE role_slug='chief_sales';
UPDATE public.company_calendar SET owner_name='Braden' WHERE owner_role='coo';
UPDATE public.company_calendar SET owner_name='Dean' WHERE owner_role='chief_sales';