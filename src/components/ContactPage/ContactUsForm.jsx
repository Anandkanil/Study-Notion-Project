import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import CountryCode from "../../data/countrycode.json";
import { apiConnector } from "../../services/apiconnector";
import { contactusEndpoint } from "../../services/apis";
import { Button, Field } from "../ui";

const ContactUsForm = () => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { countrycode: "+91" } });

  const submitContactForm = async (data) => {
    setLoading(true);
    try {
      const res = await apiConnector("POST", contactusEndpoint.CONTACT_US_API, data);
      if (!res?.data?.success) throw new Error(res?.data?.message);
      toast.success(res.data.message || "Thanks! Your message has been sent.");
      // Clear the form only once the message has really been sent
      reset({ email: "", firstname: "", lastname: "", message: "", phoneNo: "", countrycode: "+91" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit(submitContactForm)} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" required autoComplete="given-name" error={errors.firstname?.message} {...register("firstname", { required: "Enter your first name." })} />
        <Field label="Last name" autoComplete="family-name" {...register("lastname")} />
      </div>
      <Field
        label="Email address"
        type="email"
        required
        autoComplete="email"
        error={errors.email?.message}
        {...register("email", {
          required: "Enter your email so we can reply.",
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address." },
        })}
      />
      <div className="grid grid-cols-[minmax(0,140px)_1fr] gap-3">
        <Field label="Country code" as="select" autoComplete="tel-country-code" {...register("countrycode")}>
          {CountryCode.map((ele) => (
            <option key={`${ele.country}-${ele.code}`} value={ele.code}>
              {ele.code} {ele.country}
            </option>
          ))}
        </Field>
        <Field
          label="Phone (optional)"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          error={errors.phoneNo?.message}
          {...register("phoneNo", { pattern: { value: /^[0-9]{6,12}$/, message: "Enter 6 to 12 digits." } })}
        />
      </div>
      <Field
        label="Message"
        as="textarea"
        required
        rows={6}
        error={errors.message?.message}
        {...register("message", { required: "Write a message.", maxLength: { value: 5000, message: "Keep it under 5,000 characters." } })}
      />
      <Button type="submit" size="lg" loading={loading} loadingText="Sending…" className="self-start">
        Send message
      </Button>
    </form>
  );
};

export default ContactUsForm;
