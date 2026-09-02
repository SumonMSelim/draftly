/** Spec §54: the app must clearly communicate its local-only, no-upload privacy model. */
export function PrivacyNotice() {
  return (
    <p className="privacy-notice">
      <strong>Your documents stay in your browser.</strong> This application does not upload your documents.
    </p>
  );
}

export default PrivacyNotice;
