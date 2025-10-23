// src/utils/feedback-webhook.ts

/**
 * Sends user feedback to the configured Make.com webhook.
 *
 * @param userName The name of the user sending the feedback.
 * @param feedbackText The content of the feedback message.
 * @returns A promise that resolves if the feedback is sent successfully, and rejects otherwise.
 */
export const sendFeedback = async (userName: string, feedbackText: string): Promise<void> => {
  const webhookUrl = import.meta.env.VITE_FEEDBACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("Feedback webhook URL is not configured. Skipping feedback submission.");
    // For development, we can resolve gracefully. For production, you might want to throw an error.
    return Promise.resolve();
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_name: userName,
        feedback_text: feedbackText,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed with status ${response.status}`);
    }

    console.log('✅ Feedback sent successfully!');
  } catch (error) {
    console.error('❌ Error sending feedback:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
