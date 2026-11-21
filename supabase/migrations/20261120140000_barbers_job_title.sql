-- Cargo del barbero (20/11/2026, pedido de Juan): sale sobre su foto en la página pública, encima
-- del nombre ("CEO y barbero"). Lo escribe el administrador en el panel. Vacío no sale.
-- Las políticas de `barbers` no cambian: se lee igual que el nombre y la presentación.

alter table public.barbers
  add column job_title text
    check (job_title is null or (length(trim(job_title)) > 0 and length(job_title) <= 40));

comment on column public.barbers.job_title is
  'Cargo que sale sobre la foto en la página pública, por ejemplo "CEO y barbero". Máximo 40 caracteres.';
