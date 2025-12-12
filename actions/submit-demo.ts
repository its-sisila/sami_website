"use server";

import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

const schema = z.object({
    name: z.string().min(2),
    company: z.string().min(2),
    email: z.string().email(),
    message: z.string().min(5),
});

export async function submitDemoRequest(formData: z.infer<typeof schema>) {
    const validatedFields = schema.safeParse(formData);

    if (!validatedFields.success) {
        return { error: "Invalid fields" };
    }

    const { name, company, email, message } = validatedFields.data;

    try {
        const data = await resend.emails.send({
            from: "SAMI Demo Request <onboarding@resend.dev>", // Update this when you have a verified domain
            to: ["delivered@resend.dev"], // Change this to your actual email
            subject: `New Demo Request from ${company}`,
            html: `
        <h2>New Demo Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
        });

        if (data.error) {
            console.error("Resend Error:", data.error);
            return { error: "Failed to send email. Please try again later." };
        }

        return { success: true };
    } catch (error) {
        console.error("Server Error:", error);
        return { error: "Something went wrong. Please try again." };
    }
}
