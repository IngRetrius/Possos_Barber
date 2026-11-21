-- Cargo del barbero (20/11/2026): columna opcional de hasta 40 caracteres que se lee sin sesión,
-- como el nombre, y que solo cambian el administrador o el mismo barbero.
begin;
\ir ../fixtures/setup.psql
select plan(7);

select has_column('public', 'barbers', 'job_title', 'barbers tiene la columna job_title');
select col_is_null('public', 'barbers', 'job_title', 'El cargo es opcional');

select throws_ok(
  $$ update public.barbers set job_title = '   ' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'Un cargo en blanco no se guarda'
);
select throws_ok(
  $$ update public.barbers set job_title = repeat('a', 41) where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'Un cargo de más de 40 caracteres no se guarda'
);

-- El administrador lo escribe.
select tests.login('a0000000-0000-0000-0000-000000000001');
update public.barbers set job_title = 'CEO y barbero' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;

-- Sin sesión se lee, como el nombre.
select tests.login_anon();
select results_eq(
  $$ select job_title from public.barbers where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('CEO y barbero'::text) $$,
  'Sin sesión se lee el cargo del barbero activo'
);
reset role;

-- Otro barbero no cambia el cargo ajeno: RLS deja la fila fuera y no se actualiza nada.
select tests.login('b0000000-0000-0000-0000-000000000001');
update public.barbers set job_title = 'Dueño' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $$ select job_title from public.barbers where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('CEO y barbero'::text) $$,
  'Otro barbero no cambia el cargo ajeno'
);

-- Sin sesión no se escribe.
select tests.login_anon();
select throws_ok(
  $$ update public.barbers set job_title = 'Dueño' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'Sin sesión no se cambia el cargo'
);
reset role;

select * from finish();
rollback;
