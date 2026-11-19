-- Prueba de ejemplo de F0: comprueba que el pipeline de pgTAP corre.
begin;
select plan(1);
select pass('base');
select * from finish();
rollback;
