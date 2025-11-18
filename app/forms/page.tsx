"use client";

import { FormComp, userInputSchema } from "@/components/formcomp";
import { useRouter } from "next/navigation";
import { z } from "zod";

export default function FormsPage() {
    const router = useRouter();

    const handleFormSubmit = (formData: z.infer<typeof userInputSchema>) => {
        // Encode the formData as JSON string for URL query params
        const encodedData = encodeURIComponent(JSON.stringify(formData));
        router.push(`/test?data=${encodedData}`);
        return;
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            <FormComp onFormSubmit={handleFormSubmit} />
        </main>
    );
}
