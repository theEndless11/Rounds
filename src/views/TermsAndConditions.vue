<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="terms-container">
        <div class="header-section">
          <ion-buttons>
            <ion-back-button default-href="/"></ion-back-button>
          </ion-buttons>
          <h1 class="page-title">Terms of Service</h1>
        </div>

        <p class="last-updated"><strong>Last Updated:</strong> February 6, 2026</p>

        <p class="intro-text">
          Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the <strong>Rounds</strong> mobile application (the "Service") operated by Rounds Team (represented by Rohan YJ) ("us", "we", or "our").
        </p>

        <p class="intro-text">
          Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
        </p>

        <p class="highlight">
          <strong>By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.</strong>
        </p>

        <section>
          <h2>1. Description of Service</h2>
          <p>
            <strong>Rounds</strong> is a professional networking platform designed specifically for medical professionals. The Service allows users to create profiles, browse job listings, and interact with other professionals via a social feed.
          </p>
        </section>

        <section>
          <h2>2. Accounts and Verification</h2>
          <p>
            To access certain features of the Service (such as posting or commenting), you must verify your account by providing valid medical credentials (e.g., Medical Degree, Medical Council Registration).
          </p>
          <ul>
            <li>You agree that the information you provide for verification is accurate and complete.</li>
            <li>You are responsible for safeguarding the password that you use to access the Service.</li>
            <li>We reserve the right to reject or revoke verification status at our sole discretion if we suspect fraudulent documentation.</li>
          </ul>
        </section>

        <section>
          <h2>3. Medical Disclaimer (Important)</h2>
          <p class="highlight">
            <strong>Rounds is a professional networking tool, not a medical device or telemedicine platform.</strong>
          </p>
          <ul>
            <li><strong>No Medical Advice:</strong> Content found on the Service (posts, comments, articles) is for informational and networking purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment.</li>
            <li><strong>No Patient Data:</strong> You agree strictly <strong>NOT</strong> to post Protected Health Information (PHI) or any patient-identifiable data. Violating patient privacy laws (such as HIPAA or local equivalents) is grounds for immediate account termination.</li>
          </ul>
        </section>

        <section>
          <h2>4. User-Generated Content (UGC) Policy</h2>
          <p class="highlight">
            <strong>Rounds has a zero-tolerance policy for objectionable content and abusive behavior.</strong>
          </p>
          <p>By using the Service, you agree <strong>NOT</strong> to post content that:</p>
          <ol>
            <li>Is unlawful, threatening, abusive, harassing, defamatory, libelous, deceptive, fraudulent, invasive of another's privacy, or tortious.</li>
            <li>Contains hate speech, including content that attacks people based on their race, ethnicity, national origin, religious affiliation, sexual orientation, sex, gender identity, or serious disabilities/diseases.</li>
            <li>Contains nudity, pornography, or sexually explicit material.</li>
            <li>Promotes or incites violence or illegal acts.</li>
          </ol>
          
          <h3>Our Rights:</h3>
          <ul>
            <li><strong>Monitoring:</strong> We reserve the right to monitor user content and to remove any content that violates these Terms without prior notice.</li>
            <li><strong>Blocking/Reporting:</strong> Users have the ability to block other users and report objectionable content.</li>
            <li><strong>Action:</strong> We will investigate reported content within 24 hours. Users found violating this policy will have their content removed and may be temporarily or permanently banned from the Service.</li>
          </ul>
        </section>

        <section>
          <h2>5. Intellectual Property</h2>
          <p>
            The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of <strong>[Your Name/Company Name]</strong> and its licensors.
          </p>
        </section>

        <section>
          <h2>6. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
          <ul>
            <li>Upon termination, your right to use the Service will immediately cease.</li>
            <li>If you wish to terminate your account, you may simply discontinue using the Service or use the "Delete Account" feature in the app settings.</li>
          </ul>
        </section>

        <section>
          <h2>7. Limitation of Liability</h2>
          <p>
            In no event shall <strong>[Your Name/Company Name]</strong> be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service.
          </p>
        </section>

        <section>
          <h2>8. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of <strong>Karnataka, India</strong>, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2>9. Changes</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
          </p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us:</p>
          <p><strong>Email:</strong> support@rounds-app.com</p>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonButtons,
  IonBackButton,
} from '@ionic/vue';
</script>

<style scoped>
.terms-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
}

.header-section {
  position: relative;
  padding: 16px 20px 8px 20px;
  margin-bottom: 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 12px 0 0 0;
  color: var(--text-primary);
}

ion-buttons {
  margin-bottom: 8px;
}

.last-updated {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
  padding: 0 20px;
}

.intro-text {
  margin-bottom: 16px;
  line-height: 1.6;
  color: var(--text-primary);
  padding: 0 20px;
}

.highlight {
  background-color: var(--quote-background);
  padding: 12px;
  border-radius: 8px;
  margin: 16px 20px;
  line-height: 1.6;
}

section {
  margin-bottom: 32px;
  padding: 0 20px;
}

h2 {
  font-size: 20px;
  font-weight: 600;
  margin-top: 32px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

h3 {
  font-size: 16px;
  font-weight: 600;
  margin-top: 20px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

p {
  margin-bottom: 12px;
  line-height: 1.6;
  color: var(--text-primary);
}

ul, ol {
  margin-left: 20px;
  margin-bottom: 12px;
  line-height: 1.6;
}

li {
  margin-bottom: 8px;
  color: var(--text-primary);
}

strong {
  font-weight: 600;
}
</style>