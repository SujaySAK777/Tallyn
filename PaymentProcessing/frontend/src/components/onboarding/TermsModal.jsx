export default function TermsModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="terms-modal-overlay" onClick={onClose}>
      <div className="terms-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Terms &amp; Conditions</h3>
        <p className="terms-modal-placeholder-note">
          Placeholder text for development only — replace with reviewed legal copy before production release.
        </p>
        <p>
          By creating a Tallyn account you agree to use the service responsibly, keep your
          login credentials and TPIN confidential, and accept that all payments you authorize
          are final once processed.
        </p>
        <p>
          Tallyn will use the information you provide (name, mobile number, email) solely to
          operate your account, verify your identity, and communicate important updates about
          your payments.
        </p>
        <p>
          You may close your account at any time by contacting support. Continued use of the
          service after changes to these terms constitutes acceptance of the updated terms.
        </p>
        <button type="button" className="terms-modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
