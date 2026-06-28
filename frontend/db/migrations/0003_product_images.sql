insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public catalogue images may be read without authentication. Uploads and
-- deletes are performed only by server routes using the service-role client.
drop policy if exists "Public product image reads" on storage.objects;

create policy "Public product image reads"
on storage.objects for select
to public
using (bucket_id = 'product-images');
