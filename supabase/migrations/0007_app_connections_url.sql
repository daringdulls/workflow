-- Lets an admin record the connected app's own live URL, so its Pixel Core
-- connection page can link straight to it instead of only showing a summary.
alter table app_connections add column app_url text;
