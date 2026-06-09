-- نوع مرجع حركة نقدية للمدخول الخارجي
alter type cash_reference_type add value if not exists 'external_income';
