"use client";

import Script from "next/script";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { createCheckoutSubscription } from "../server/subscription";

export function UpgradeButton() {
  const [isPending, startTransition] = useTransition();
  const [scriptReady, setScriptReady] = useState(false);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
      />
      <Button
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await createCheckoutSubscription();

            if (!result.ok) {
              toast.error(result.error);
              return;
            }

            toast.success(
              scriptReady
                ? `Razorpay subscription ready: ${result.subscriptionId}`
                : "Subscription created. Razorpay checkout script is still loading.",
            );
          });
        }}
      >
        {isPending ? "Preparing checkout..." : "Upgrade to Pro"}
      </Button>
    </>
  );
}
