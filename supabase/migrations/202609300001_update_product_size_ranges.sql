update nck.products
set
  title = 'Small',
  product_type = '1-49 kids'
where plan_tier = 'essential';

update nck.products
set
  title = 'Medium',
  product_type = '50-99 kids'
where plan_tier = 'growth';

update nck.products
set
  title = 'Large',
  product_type = '100+ kids'
where plan_tier = 'scale';
