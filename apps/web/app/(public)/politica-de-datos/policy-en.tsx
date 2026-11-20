import { BUSINESS } from "../../../lib/business";
import { PolicySection as Section } from "./policy-section";

/**
 * English translation of the policy. It is a courtesy translation: the Spanish text (policy-es)
 * is the one that governs, and the page says so. Keep both in step when the policy changes.
 */
export function PolicyEn() {
  return (
    <>
      <p className="rounded-card border border-border bg-surface px-4 py-3 text-body">
        This is a translation for your convenience. The Spanish version is the one that governs.
      </p>

      <Section title="1. Who is responsible">
        <p>
          {BUSINESS.name} is the barbershop that schedules your appointments and decides how your
          data is processed.
        </p>
        <ul>
          <li>Name or company name: [PENDING].</li>
          <li>ID or tax number (NIT): [PENDING].</li>
          <li>
            Address: {BUSINESS.address}, {BUSINESS.city}, {BUSINESS.region}, Colombia.
          </li>
          <li>Email for questions and complaints: [PENDING].</li>
          <li>Phone: [PENDING].</li>
        </ul>
        <p>
          This policy follows Colombian Law 1581 of 2012, Decree 1377 of 2013 (compiled in Decree
          1074 of 2015) and the other Colombian rules on personal data protection.
        </p>
      </Section>

      <Section title="2. What data we process">
        <ul>
          <li>
            For your account: your name, your mobile number and your email. If you sign in with
            Google, we receive your name and email from Google. Your password is stored encrypted by
            our accounts provider; no one at the barbershop can see it.
          </li>
          <li>
            About your appointments: date, time, service, barber, price, whether you cancelled or
            changed it, and whether you came.
          </li>
          <li>Notes the barber writes about your service (for example, how you like your cut).</li>
          <li>
            Your authorizations: when you accepted this policy, which version you accepted and
            whether you agreed to receive WhatsApp messages.
          </li>
          <li>
            Technical data: the cookies needed to keep you signed in and remember your language, and
            the logs our hosting providers keep for security (such as IP address and browser).
          </li>
        </ul>
        <p>
          If the barber books an appointment for you without an account, they store your name and
          mobile number with the verbal authorization you give them.
        </p>
        <p>
          We don&apos;t ask for sensitive data (such as health or biometric data) or identity
          documents.
        </p>
      </Section>

      <Section title="3. What we use it for">
        <ul>
          <li>Creating and managing your account.</li>
          <li>
            Booking, changing, cancelling and reminding you of your appointments, and showing your
            history.
          </li>
          <li>
            Keeping an attendance record. If you miss 2 appointments without cancelling, your next
            bookings stay pending until the barber approves them.
          </li>
          <li>
            Sending you the confirmation and reminders of your appointments on WhatsApp, only if you
            authorize it separately. We don&apos;t send advertising that way.
          </li>
          <li>Contacting you about an appointment, for example if the barber needs to move it.</li>
          <li>
            Keeping the barbershop&apos;s internal accounts: the price of each service and how it is
            split between the barber and the barbershop.
          </li>
          <li>Handling your questions and complaints, and meeting legal obligations.</li>
        </ul>
        <p>We don&apos;t sell your data or use it for third-party advertising.</p>
      </Section>

      <Section title="4. Who sees your data">
        <ul>
          <li>
            The barber you have appointments with sees your name, mobile number and those
            appointments.
          </li>
          <li>The barbershop&apos;s administrator can see all data to manage the schedule.</li>
          <li>
            No other customer sees your name or mobile number. Free times are shown without anyone
            else&apos;s data.
          </li>
        </ul>
      </Section>

      <Section title="5. Providers and data outside Colombia">
        <p>
          To run the app we use providers that process data on our behalf, only for the purposes of
          this policy:
        </p>
        <ul>
          <li>Supabase: database and accounts. Its servers are in the United States.</li>
          <li>Vercel: website hosting. Its servers are in the United States.</li>
          <li>
            Meta Platforms (WhatsApp Business): sending confirmations and reminders, only if you
            authorized them.
          </li>
          <li>Google: only if you choose to sign in with your Google account.</li>
        </ul>
        <p>
          This means your data is transmitted to and stored outside Colombia. By accepting this
          policy you authorize that transmission.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>As the owner of your data you have the right to:</p>
        <ul>
          <li>Know, update and correct your data.</li>
          <li>Ask for proof of the authorization you gave us.</li>
          <li>Know, on request, how we have used your data.</li>
          <li>
            File complaints with the Superintendence of Industry and Commerce (SIC) for breaches of
            the law.
          </li>
          <li>
            Revoke the authorization or ask us to delete your data, except when the law or a
            contract requires us to keep it.
          </li>
          <li>Access your data free of charge.</li>
        </ul>
        <p>
          If you are under 18, your mother, father or legal representative must authorize the
          processing of your data.
        </p>
      </Section>

      <Section title="7. How to exercise them">
        <ul>
          <li>
            In the app: in your Profile you can see and correct your name and mobile number, remove
            the WhatsApp authorization and delete your account.
          </li>
          <li>
            By email, to the address in section 1, or in person at the barbershop. You, your heirs
            or your representative can do it.
          </li>
        </ul>
        <p>
          Questions: we answer within 10 business days at most. If we can&apos;t, we tell you why
          and answer within 5 more business days at most.
        </p>
        <p>
          Complaints (correcting, updating or deleting data, revoking the authorization or reporting
          a breach): include your name, what happened, how to reply to you and any documents you
          want to attach. If something is missing, we ask for it within the next 5 days; if 2 months
          pass without you sending it, we understand you withdrew it. We answer within 15 business
          days at most, extendable by up to 8 more business days if we tell you why. Meanwhile, we
          mark your data as &quot;complaint in progress&quot;.
        </p>
        <p>
          You can complain to the SIC (www.sic.gov.co) after making the question or complaint with
          us.
        </p>
      </Section>

      <Section title="8. How long we keep it and what happens when you delete your account">
        <p>
          We keep your data while you have an account and while it serves the purposes of this
          policy.
        </p>
        <p>
          When you delete your account, your name, mobile number, email, authorizations and the
          barber&apos;s notes about you are deleted. Past appointments and charges stay in the
          schedule without data that identifies you, so the barbershop&apos;s accounts still add up.
          If you have an upcoming appointment, you must cancel it first.
        </p>
      </Section>

      <Section title="9. How we protect your data">
        <p>
          The connection to the app is encrypted (HTTPS). Each person can only see what concerns
          them: the database checks who is asking on every query. Passwords are stored encrypted.
        </p>
      </Section>

      <Section title="10. Changes and validity">
        <p>
          If this policy changes in an important way, we show it to you again and ask for your
          authorization when you sign in. It is valid from [PENDING] and the databases are kept
          while the barbershop provides the service.
        </p>
      </Section>
    </>
  );
}
