"use server"

import { createClient, createServiceClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function signEngagementLetter(clientId: string, pdfData?: string, signatureDataUrl?: string, clientName?: string) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: "Not authenticated" };
        }

        const { data: authorizedClient, error: authorizationError } = await supabase
            .from('clients')
            .select('id')
            .eq('id', clientId)
            .maybeSingle();

        if (authorizationError) throw authorizationError;

        if (!authorizedClient) {
            return { success: false, error: "Not authorized to sign this engagement letter" };
        }

        let writeClient: SupabaseServerClient = supabase;

        try {
            writeClient = createServiceClient();
        } catch {
            console.warn('SUPABASE_SERVICE_ROLE_KEY missing. Falling back to session client for engagement letter signing.');
        }

        // 1. Update client status
        const { error: updateError } = await writeClient
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

            // Generate readable filename
            const safeName = (clientName || 'client').replace(/[^a-zA-Z0-9]/g, '_');
            const documentFileName = `Engagement_Letter_${safeName}_${timestamp}.pdf`;
            const documentFilePath = `${clientId}/consent/${documentFileName}`;

            // 2a. Upload signature image (if provided)
            if (signatureDataUrl) {
                const base64Signature = signatureDataUrl.split(',')[1];
                const signatureBuffer = Buffer.from(base64Signature, 'base64');
                const { error: signatureUploadError } = await writeClient.storage
                    .from('signatures')
                    .upload(signatureFileName, signatureBuffer, {
                        contentType: 'image/png',
                        upsert: true
                    });

                if (signatureUploadError) throw signatureUploadError;
            }

            // 2b. Upload PDF document
            const pdfBuffer = Buffer.from(pdfData, 'base64');
            const { error: docUploadError } = await writeClient.storage
                .from('client-documents')
                .upload(documentFilePath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (docUploadError) throw docUploadError;

            // 2c. Record in documents table
            const { error: dbError } = await writeClient.from('documents').insert({
                client_id: clientId,
                file_name: documentFileName,
                document_type: 'engagement_letter',
                file_path: documentFilePath,
                file_size: pdfBuffer.length,
                mime_type: 'application/pdf',
                description: 'Signed Engagement Letter (Official PDF)',
                is_verified: true,
                uploaded_by: user.id
            });

            if (dbError) console.error("Error creating document record:", dbError);
        }

        // 3. Log this action in client history
        const { error: historyError } = await writeClient
            .from('client_history')
            .insert({
                client_id: clientId,
                action_type: 'note',
                title: 'Engagement Letter Signed',
                description: 'The client signed the engagement letter in-app with a digital signature record.',
            });

        if (historyError) {
            console.error("Error creating client history record:", historyError);
        }

        revalidatePath(`/clients/${clientId}`);
        revalidatePath('/dashboard');

        return { success: true };
    } catch (error) {
        console.error("Error signing engagement letter:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to sign" };
    }
}
