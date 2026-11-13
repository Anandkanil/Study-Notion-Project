import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/common/Footer";

const CONTACT = "studynotionbiz@gmail.com";
const UPDATED = "13 November 2026";

const Section = ({ title, children }) => (
  <section className="flex flex-col gap-3">
    <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
    <div className="flex flex-col gap-3 leading-relaxed text-muted [&_strong]:text-ink [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">{children}</div>
  </section>
);

const Mail = () => (
  <a href={`mailto:${CONTACT}`} className="font-semibold text-accent-text underline-offset-4 hover:underline">
    {CONTACT}
  </a>
);

function Privacy() {
  return (
    <>
      <Section title="What we collect">
        <ul>
          <li><strong>Account details:</strong> your name, email address and password (stored only as a secure hash). If you sign in with Google or GitHub, we receive your name, email address and profile picture from them.</li>
          <li><strong>Profile details you choose to add:</strong> gender, date of birth, phone number, a short bio and a photo.</li>
          <li><strong>Learning activity:</strong> the courses you join, lessons you finish, notes, saved lessons, quiz attempts, questions, reviews, certificates and your learning streak.</li>
          <li><strong>Purchases:</strong> what you bought, the amount and the payment reference. Card, UPI and bank details are handled by Razorpay and never reach our servers.</li>
          <li><strong>Messages:</strong> anything you send through the contact form.</li>
        </ul>
      </Section>
      <Section title="How we use it">
        <ul>
          <li>To run your account, show your courses and progress, and issue certificates.</li>
          <li>To process payments and refunds, and send receipts.</li>
          <li>To send emails you need: sign-up codes, password resets, receipts, course updates from your instructors, answers to your questions and, if you keep them on, learning reminders.</li>
          <li>To keep StudyNotion secure, for example by limiting repeated login attempts.</li>
        </ul>
        <p>We don't sell your data, and we don't show ads.</p>
      </Section>
      <Section title="Who else handles it">
        <p>StudyNotion uses these services to run. Each receives only what it needs:</p>
        <ul>
          <li><strong>MongoDB Atlas</strong>: stores the database.</li>
          <li><strong>Render</strong> and <strong>Netlify</strong>: host the server and the website.</li>
          <li><strong>Cloudinary</strong>: stores course videos, thumbnails and profile photos.</li>
          <li><strong>Brevo</strong>: sends our emails.</li>
          <li><strong>Razorpay</strong>: processes payments.</li>
          <li><strong>Google</strong> and <strong>GitHub</strong>: only if you choose to sign in with them.</li>
        </ul>
        <p>Instructors can see the names of students in their courses, along with their progress, questions and reviews.</p>
      </Section>
      <Section title="Cookies and storage">
        <p>
          We use one essential cookie to keep you signed in. Your browser also stores your cart, theme and a few display preferences. We don't use advertising or tracking cookies.
        </p>
      </Section>
      <Section title="Your choices">
        <ul>
          <li>Edit your profile any time in <Link to="/dashboard/settings" className="font-semibold text-accent-text underline-offset-4 hover:underline">Settings</Link>.</li>
          <li>Delete your account from Settings. This removes your account, profile, course progress and reviews. Purchase records are kept for accounting.</li>
          <li>Turn learning reminder emails off in Settings, or with the link in any reminder.</li>
          <li>For a copy of your data or any other request, email <Mail />.</li>
        </ul>
      </Section>
    </>
  );
}

function Terms() {
  return (
    <>
      <Section title="Using StudyNotion">
        <ul>
          <li>Give accurate details when you create an account, and keep your password private. You're responsible for what happens in your account.</li>
          <li>Don't misuse the service: no attempts to break in, scrape content, overload the servers or harass other people.</li>
          <li>We may suspend accounts that break these terms.</li>
        </ul>
      </Section>
      <Section title="Courses and content">
        <ul>
          <li>Buying a course gives you personal access to watch it. Course videos and materials belong to their instructors and StudyNotion. Don't download, share or resell them.</li>
          <li>Instructors are responsible for their courses. Courses are reviewed before they're published.</li>
          <li>Reviews, questions and notes you post should be your own and respectful. We may hide content that isn't.</li>
        </ul>
      </Section>
      <Section title="Payments and refunds">
        <ul>
          <li>Prices are shown in Indian rupees (₹). Payments are processed by Razorpay.</li>
          <li>If there's a problem with a purchase, email <Mail /> with your order ID. Refunds are decided case by case and go back to your original payment method. You'll get a refund receipt in your Purchases page.</li>
        </ul>
      </Section>
      <Section title="Certificates">
        <p>
          Certificates confirm that you finished every lesson in a course on StudyNotion. They aren't an accredited qualification. Anyone can check a certificate at{" "}
          <Link to="/verify" className="font-semibold text-accent-text underline-offset-4 hover:underline">studynotion-project-1.netlify.app/verify</Link>.
        </p>
      </Section>
      <Section title="The service">
        <p>
          We work to keep StudyNotion available and accurate, but it's provided as it is, and features may change. We may update these terms. If we make an important change, we'll show a notice on the site.
        </p>
        <p>Questions? Email <Mail />.</p>
      </Section>
    </>
  );
}

/** Privacy Policy and Terms of Use, in plain language. */
export default function Legal({ page }) {
  const isPrivacy = page === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Use";
  useEffect(() => {
    document.title = `${title} · StudyNotion`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <>
      <article className="mx-auto flex w-11/12 max-w-3xl flex-col gap-10 py-14">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold text-ink">{title}</h1>
          <p className="text-muted">Last updated {UPDATED}</p>
          <p className="text-muted">
            {isPrivacy
              ? "This explains what StudyNotion collects when you use it, why, and the choices you have."
              : "These terms apply when you use StudyNotion. By creating an account or buying a course, you agree to them."}
          </p>
        </header>
        {isPrivacy ? <Privacy /> : <Terms />}
        <p className="text-sm text-muted">
          See also the{" "}
          <Link to={isPrivacy ? "/terms" : "/privacy"} className="font-semibold text-accent-text underline-offset-4 hover:underline">
            {isPrivacy ? "Terms of Use" : "Privacy Policy"}
          </Link>
          .
        </p>
      </article>
      <Footer />
    </>
  );
}
