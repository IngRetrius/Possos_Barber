import { startTransition, type FormEvent } from "react";

/**
 * `onSubmit` para un `<form action={formAction}>` de `useActionState` que no debe vaciarse.
 *
 * React 19 resetea los campos no controlados de un `<form action>` al terminar la acción: si la
 * acción devuelve un error de validación, lo escrito se pierde. Con este `onSubmit` el envío pasa
 * por `startTransition` (el estado `pending` sigue funcionando) y el formulario no se resetea.
 * El formulario no debe tener botones con su propio `formAction`: este `onSubmit` los ignora.
 */
export function submitKeepingValues(action: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(data));
  };
}
