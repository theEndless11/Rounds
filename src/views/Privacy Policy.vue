<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="privacy-container">
        <div class="header-section">
          <ion-buttons>
            <ion-back-button default-href="/"></ion-back-button>
          </ion-buttons>
          <h1 class="page-title">Privacy Policy</h1>
        </div>

        <p class="last-updated"><strong>Last Updated:</strong> February 6, 2026</p>

        <p class="intro-text">
          <strong>Rounds</strong> ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application, <strong>Rounds: The Professional Network for Doctors</strong> (the "App").
        </p>

        <p class="intro-text">
          By using the App, you agree to the collection and use of information in accordance with this policy.
        </p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>
            We collect only the information necessary to provide a secure, professional networking environment.
          </p>

          <h3>A. Personal Information</h3>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, and phone number.</li>
            <li><strong>Professional Interests:</strong> You may select up to three medical interests (e.g., "Cardiology," "General Medicine"). We use this data to curate your Home Feed and show you content relevant to your specific fields of interest.</li>
            <li><strong>Profile Data:</strong> Work history, education, and profile pictures you choose to upload.</li>
          </ul>

          <h3>B. Sensitive Verification Data (Crucial)</h3>
          <p>To ensure <strong>Rounds</strong> remains a trusted community for verified medical professionals, we collect:</p>
          <ul>
            <li><strong>Verification Documents:</strong> Images of your medical degree, medical council registration, or hospital ID.</li>
            <li><strong>Purpose:</strong> This data is collected <strong>solely</strong> to verify your status as a medical practitioner.</li>
            <li><strong>Handling:</strong> Once your verification is processed, this data is <strong>Stored securely and encrypted for audit purposes</strong>. It is never shared with third parties or used for marketing.</li>
          </ul>

          <h3>C. Communications and User Content</h3>
          <ul>
            <li><strong>Private Messages:</strong> We collect and store the content of messages and attachments you send to other users to facilitate the messaging service.</li>
            <li><strong>User-Generated Content (UGC):</strong> Content you create, including posts, comments, and images uploaded to the Home Feed. Please be aware that content you post on the Home Feed is visible to other verified users on the platform.</li>
            <li><strong>Usage Metadata:</strong> We log when you send messages or interact with posts to prevent abuse and improve service stability.</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use your data for the following purposes:</p>
          <ul>
            <li><strong>To Provide Services:</strong> Creating your account, displaying your profile, facilitating the job board, and <strong>delivering private messages between users.</strong></li>
            <li><strong>Verification:</strong> To confirm your credentials before granting access to posting/commenting features.</li>
            <li><strong>Safety & Moderation:</strong> To enforce our Terms of Service. <strong>Note:</strong> While we do not proactively read private messages, we may access message history if a user is reported for harassment or severe policy violations (e.g., threat of violence).</li>
            <li><strong>Communication:</strong> To send you updates about your account, security alerts, or job application statuses.</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Retention and Deletion</h2>
          <p>
            We retain your personal information only as long as necessary to provide our services or as required by law.
          </p>
          <ul>
            <li><strong>Account Deletion:</strong> You have the right to delete your account at any time. You can do this directly within the App by navigating to <strong>Profile > Settings > Delete Account</strong>.</li>
            <li><strong>Effect of Deletion:</strong> Upon request, your account and personal data will be deleted from our active databases. Some data may be retained in backups for a limited period or as required by legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2>4. Third-Party Services</h2>
          <p>
            We may employ third-party companies to facilitate our service (e.g., hosting, database management, analytics). These third parties have access to your Personal Information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
          </p>
          <ul>
            <li><strong>Hosting:</strong> [e.g., Railway]</li>
            <li><strong>Authentication:</strong> [e.g., Firebase Auth / Supabase Auth]</li>
            <li>Job listing API</li>
          </ul>
        </section>

        <section>
          <h2>5. Security</h2>
          <p>
            We value your trust in providing us your Personal Information, thus we strive to use commercially acceptable means of protecting it. However, remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.
          </p>
        </section>

        <section>
          <h2>6. Children's Privacy</h2>
          <p>
            Our Services do not address anyone under the age of 18. We do not knowingly collect personally identifiable information from children. If we discover that a child under 18 has provided us with personal information, we immediately delete this from our servers.
          </p>
        </section>

        <section>
          <h2>7. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. Thus, you are advised to review this page periodically for any changes. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
        </section>

        <section>
          <h2>8. Contact Us</h2>
          <p>If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at:</p>
          <ul>
            <li><strong>Email:</strong> support@rounds-app.com</li>
            <li><strong>Developer:</strong> Rounds team</li>
          </ul>
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
.privacy-container {
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

ul {
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