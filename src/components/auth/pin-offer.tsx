import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { clearQueuedPinOffer, setPinEnabled, takeQueuedPinOffer } from "@/lib/auth/pin-gate";

/** After the first password login on this device — PIN is optional re-entry. */
export function PinOfferDialog() {
  const [login, setLogin] = useState<string | null>(null);

  useEffect(() => {
    setLogin(takeQueuedPinOffer());
  }, []);

  function finish(enable: boolean) {
    if (login) setPinEnabled(login, enable);
    clearQueuedPinOffer();
    setLogin(null);
  }

  return (
    <Dialog
      open={Boolean(login)}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
    >
      <DialogContent title="Входить по PIN?">
        <p className="text-sm leading-relaxed text-muted">
          Пароль уже принят. С этого устройства можно открывать контур четырьмя цифрами PIN — без пароля. На другом
          браузере снова будет логин и пароль.
        </p>
        <div className="mt-5 flex min-w-0 gap-2">
          <Button type="button" variant="ghost" className="min-w-0 flex-1" onClick={() => finish(false)}>
            Только пароль
          </Button>
          <Button type="button" className="min-w-0 flex-1" onClick={() => finish(true)}>
            Включать PIN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
