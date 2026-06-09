-- قيم enum جديدة لتصنيفات المصاريف
-- يجب commit منفصل قبل استخدامها في INSERT (ملف 0016)
alter type expense_group add value if not exists 'daily_life';
alter type expense_group add value if not exists 'factory';
alter type expense_group add value if not exists 'barn';
alter type expense_group add value if not exists 'personal';
