import { Link } from 'react-router-dom'
import { LegalPage } from '@/components/legal/LegalPage'
import { LEGAL } from '@/lib/legal'

const mail = (e: string) => <a href={`mailto:${e}`}>{e}</a>

export default function Terms() {
  const sections = [
    {
      id: 'about',
      title: 'About these terms',
      body: (
        <>
          <p>
            These terms are an agreement between you and <strong>{LEGAL.company}</strong> (RC {LEGAL.rc}), {LEGAL.address} (“NexHood”, “we”, “us”).
            By creating an account, accepting an invite, or using NexHood, you agree to them. If you use NexHood for an estate (for example as its admin),
            you also agree on behalf of that estate.
          </p>
          <p>
            How we handle personal data is explained in our <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </>
      ),
    },
    {
      id: 'emergency',
      title: 'Important: NexHood is not an emergency service',
      body: (
        <>
          <p>
            <strong>
              NexHood helps neighbours, guards and estate management reach each other faster. It is not a security company, it does not employ guards
              or police, and it is not a replacement for calling the emergency services.
            </strong>
          </p>
          <ul>
            <li>
              In an emergency, also <strong>call 112</strong> (Nigeria’s emergency number), the police or your gate directly when you can.
            </li>
            <li>
              Alerts depend on things outside our control: internet and mobile networks, phone settings (silent mode, Do Not Disturb, notifications
              turned off), battery, and whether a guard or other person sees the alert and responds.
            </li>
            <li>
              We cannot promise that an alert will be delivered, seen or answered within any time, or that anyone will respond. Response is the
              responsibility of your estate, its guards and the authorities.
            </li>
            <li>
              The emergency numbers shown in the app (such as 112, 199 and the fire service) are public numbers run by government agencies. We list them
              to save you time, but we do not run them and cannot control whether or how quickly they answer.
            </li>
            <li>
              NexHood does not connect to the police automatically. If your estate adds a police contact or police officers, they are reached the same way
              as anyone else in the app.
            </li>
            <li>Never send a false or test alert without telling your estate first. False alarms put people at risk.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'accounts',
      title: 'Accounts',
      body: (
        <ul>
          <li>You must be 18 or older to have an account.</li>
          <li>Most people join by invitation from their estate. Give accurate details, especially your phone number and house number.</li>
          <li>Keep your password private. You are responsible for what happens under your account; tell us straight away if you think it has been misused.</li>
          <li>Your estate admin can change your role or remove your account, for example when you move out.</li>
        </ul>
      ),
    },
    {
      id: 'estates',
      title: 'Estate admins and estates',
      body: (
        <>
          <p>If you run NexHood for an estate, you confirm and agree that:</p>
          <ul>
            <li>you are authorised by the estate (its management, owners or residents’ association) to use NexHood for it;</li>
            <li>
              you have a lawful reason to add residents, guards, police contacts and others, and you will tell them their details are on NexHood (sharing
              our Privacy Policy is enough);
            </li>
            <li>the estate is the controller of its residents’ data and NexHood processes it on the estate’s behalf, as set out in the Privacy Policy;</li>
            <li>
              the estate is responsible for its own decisions: who is let in, how guards respond, what bills are charged, how money is spent and how
              disputes between residents and the estate are handled;
            </li>
            <li>you will keep the estate’s police and emergency contacts up to date.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'use',
      title: 'Acceptable use',
      body: (
        <>
          <p>You must not use NexHood to:</p>
          <ul>
            <li>raise false alarms or misuse the panic button;</li>
            <li>harass, threaten, insult or discriminate against anyone, or post anything unlawful;</li>
            <li>upload fake receipts or proof of payment, or misrepresent payments or spending;</li>
            <li>use visitor or resident details for anything other than estate security and management;</li>
            <li>share anyone’s personal data outside the app without a lawful reason;</li>
            <li>try to access accounts, estates or data that are not yours, or disrupt or attack the service.</li>
          </ul>
          <p>We may remove content or suspend accounts that break these rules, and we may report serious cases to the authorities.</p>
        </>
      ),
    },
    {
      id: 'content',
      title: 'Your content',
      body: (
        <p>
          You keep ownership of what you post (messages, photos, reports). You give NexHood permission to store, display and process it only to run
          the service for your estate. You are responsible for having the right to share what you upload, including photos of other people.
        </p>
      ),
    },
    {
      id: 'money',
      title: 'Bills and payments inside an estate',
      body: (
        <ul>
          <li>
            NexHood helps estates send bills, record payments and show spending. <strong>NexHood does not hold estate money.</strong> Online payments are
            processed by Paystack and go to the estate’s own bank account; transfers go directly to the estate.
          </li>
          <li>
            The estate sets its bills and is responsible for them. Questions about how much you owe, refunds or how money was spent should go to your
            estate first.
          </li>
          <li>Online payments may include a small convenience fee, which is always shown before you pay.</li>
        </ul>
      ),
    },
    {
      id: 'plan',
      title: 'NexHood subscription (for estates)',
      body: (
        <ul>
          <li>Estates pay NexHood a subscription based on the number of houses, in advance, for at least 3 months at a time. Prices are shown in the app.</li>
          <li>New estates get a free trial. Paying early does not waste days: a new period starts when the current one ends.</li>
          <li>
            If a payment is late, the estate gets 7 days of grace. After that, some management features (such as inviting people and sending bills) pause
            until payment. <strong>Alerts, visitor passes and incident reports keep working.</strong>
          </li>
          <li>
            Fees already paid are not refunded for unused time, except where the law requires it or where we end the service without cause (we then refund
            the unused part).
          </li>
          <li>We will give at least 30 days’ notice in the app or by email before any price increase. It applies from your next payment.</li>
        </ul>
      ),
    },
    {
      id: 'service',
      title: 'The service, changes and availability',
      body: (
        <p>
          We work hard to keep NexHood available and secure, but it is provided “as is” and may sometimes be unavailable for maintenance, updates or
          reasons outside our control. We may improve, change or remove features; if a change takes away something important an estate pays for, we will
          tell the estate in advance.
        </p>
      ),
    },
    {
      id: 'end',
      title: 'Ending the service',
      body: (
        <ul>
          <li>You can stop using NexHood at any time. To close your account, ask your estate admin or email {mail(LEGAL.supportEmail)}.</li>
          <li>An estate can stop using NexHood at any time. On request within 30 days, we will give the estate an export of its records.</li>
          <li>We may suspend or close accounts that seriously or repeatedly break these terms.</li>
        </ul>
      ),
    },
    {
      id: 'liability',
      title: 'Our responsibility to you',
      body: (
        <>
          <p>To the extent Nigerian law allows:</p>
          <ul>
            <li>
              NexHood is not responsible for crimes, injuries, theft, damage or losses caused by other people, or for how (or whether) guards, estate
              management, police or emergency services respond;
            </li>
            <li>we are not responsible for indirect losses, such as lost profits or lost opportunities;</li>
            <li>
              our total responsibility to an estate for any claim is limited to the subscription fees that estate paid NexHood in the 12 months before the
              claim; for an individual user, it is limited to ₦50,000.
            </li>
          </ul>
          <p>
            Nothing in these terms limits responsibility that cannot be limited by law, including for death or personal injury caused by our negligence,
            or for fraud, or your rights under the Federal Competition and Consumer Protection Act.
          </p>
          <p>
            An estate is responsible for claims brought against NexHood because of how the estate or its admins used NexHood, such as adding people without
            a lawful reason or making unlawful decisions about residents.
          </p>
        </>
      ),
    },
    {
      id: 'disputes',
      title: 'Law and disputes',
      body: (
        <>
          <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
          <p>
            If you have a complaint, email {mail(LEGAL.supportEmail)} first; we aim to resolve it within 14 days. If we cannot agree, either side may refer
            the dispute to mediation at the Abuja Multi-Door Courthouse, and after that to the courts of the Federal Capital Territory, Abuja.
          </p>
        </>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      body: (
        <p>
          We may update these terms. We will change the date at the top, and for important changes we will tell you in the app and ask you to agree again.
          If you do not agree, you can stop using NexHood.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      body: (
        <p>
          {LEGAL.company}, {LEGAL.address}. Email {mail(LEGAL.supportEmail)}.
        </p>
      ),
    },
  ]

  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          Please read these terms. They are written in plain language. The most important part is <a href="#emergency">section 2</a>: NexHood helps people
          reach each other in an emergency, but it is not an emergency service.
        </p>
      }
      sections={sections}
    />
  )
}
