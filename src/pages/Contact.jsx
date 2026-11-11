import React from "react";
import Footer from "../components/common/Footer";
import ContactUsForm from "../components/ContactPage/ContactUsForm";

const EMAIL = "studynotionbiz@gmail.com";

const Contact = () => (
  <div className="flex flex-1 flex-col">
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 py-14 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-bold text-ink">Contact us</h1>
        <p className="text-lg text-muted">Questions about a course, a payment or teaching on StudyNotion? Send us a message and we'll reply by email.</p>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">Email</h2>
          <a href={`mailto:${EMAIL}`} className="mt-1 inline-block break-all font-semibold text-accent-text hover:underline">
            {EMAIL}
          </a>
        </div>
      </div>
      <section aria-labelledby="contact-form-title" className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <h2 id="contact-form-title" className="font-display text-2xl font-medium text-ink">
          Send a message
        </h2>
        <ContactUsForm />
      </section>
    </div>
    <Footer />
  </div>
);

export default Contact;
