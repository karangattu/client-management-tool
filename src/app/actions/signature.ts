"use server"

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function signEngagementLetter(clientId: string, pdfData?: string, signatureDataUrl?: string) {
    try {
        const supabase = await createClient();

        // 1. Update client status
        const { error: updateError } = await supabase
            .from('clients')
            .update({
                signed_engagement_letter_at: new Date().toISOString(),
                engagement_letter_version: 'March 2024'
            })
            .eq('id', clientId);

        if (updateError) throw updateError;

        // 2. If PDF data provided, store the PDF document
        if (pdfData) {
            const timestamp = Date.now();
            const signatureFileName = `${clientId}/engagement-letter-${timestamp}-sig.png`;
            const documentFileName = `engagement-letter-${timestamp}.pdf`;
            const documentFilePath = `${clientId}/consent/${documentFileName}`;

            // 2a. Upload signature image (if provided)
            if (signatureDataUrl) {
                const base64Signature = signatureDataUrl.split(',')[1];
                const signatureBuffer = Buffer.from(base64Signature, 'base64');
                await supabase.storage
                    .from('signatures')
                    .upload(signatureFileName, signatureBuffer, {
                        contentType: 'image/png',
                        upsert: true
                    });
            }

            // 2b. Upload PDF document
            const pdfBuffer = Buffer.from(pdfData, 'base64');
            const { error: docUploadError } = await supabase.storage
                .from('client-documents')
                .upload(documentFilePath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (docUploadError) throw docUploadError;

            // 2c. Record in documents table
            const { error: dbError } = await supabase.from('documents').insert({
                client_id: clientId,
                file_name: documentFileName,
                document_type: 'engagement_letter',
                file_path: documentFilePath,
                file_size: pdfBuffer.length,
                mime_type: 'application/pdf',
                description: 'Signed Engagement Letter (Official PDF)',
                is_verified: true,
                uploaded_by: (await supabase.auth.getUser()).data.user?.id
            });

            if (dbError) console.error("Error creating document record:", dbError);
        }

        // 3. Log this action in client history
        await supabase
            .from('client_history')
            .insert({
                client_id: clientId,
                action_type: 'note',
                title: 'Engagement Letter Signed',
                description: 'The client signed the engagement letter in-app with a digital signature record.',
            });

        revalidatePath(`/clients/${clientId}`);
        revalidatePath('/dashboard');

        return { success: true };
    } catch (error) {
        console.error("Error signing engagement letter:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to sign" };
    }
}
