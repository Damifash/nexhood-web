import { Link } from 'react-router-dom'
import { LegalPage } from '@/components/legal/LegalPage'
import { LEGAL } from '@/lib/legal'

const mail = (e: string) => <a href={`mailto:${e}`}>{e}</a>

export default function Privacy() {
  const sections = [
    {
      id: 'who',
      title: 'Who we are',
      body: (
        <>
          <p>
            NexHood is run by <strong>{LEGAL.company}</strong> (RC {LEGAL.rc}), {LEGAL.address} (“NexHood”, “we”, “us”). NexHood is an app that
            estates use for visitor passes, emergency alerts, incident reports, bills and estate accounts.
          </p>
          <p>
            For privacy questions or requests, contact our data protection lead, {LEGAL.dpoName}, at {mail(LEGAL.privacyEmail)}.
          </p>
        </>
      ),
    },
    {
      id: 'roles',
      title: 'Who is responsible for your data',
      body: (
        <>
          <p>There are two situations:</p>
          <ul>
            <li>
              <strong>Your estate’s records.</strong> Your estate (its management, facility manager or residents’ association) decides to use NexHood
              and invites you. For records about life in the estate (residents, houses, visitors, alerts, incidents, bills and spending), your estate is
              the <strong>data controller</strong> and NexHood is its <strong>data processor</strong>: we hold and process that data on the estate’s
              behalf and on its instructions.
            </li>
            <li>
              <strong>NexHood’s own records.</strong> For your login account, the estate’s subscription and payments to NexHood, our website, the waitlist,
              and keeping the service secure, NexHood is the <strong>data controller</strong>.
            </li>
          </ul>
          <p>Either way, you can contact us and we will help, or pass your request to your estate if it is theirs to decide.</p>
        </>
      ),
    },
    {
      id: 'what',
      title: 'What we collect',
      body: (
        <table>
          <thead>
            <tr>
              <th>What</th>
              <th>Examples</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account details</td>
              <td>Name, email, phone number, house or flat number, your role (resident, guard, admin, police contact) and estate.</td>
            </tr>
            <tr>
              <td>Visitor details</td>
              <td>Your visitor’s name, phone number (and email if you add it), visit date and time, the pass code, and when they entered and left.</td>
            </tr>
            <tr>
              <td>Alerts</td>
              <td>The type of alert, any message you add, your name and house number, the time, and who responded.</td>
            </tr>
            <tr>
              <td>Incidents, repairs and posts</td>
              <td>What you write and any photos you upload.</td>
            </tr>
            <tr>
              <td>Bills and money</td>
              <td>
                Bills for your house, payments, receipts or proof of payment you upload, and the estate’s spending records. If you pay online, Paystack processes
                your card or bank details; <strong>we never see or store your card number</strong>.
              </td>
            </tr>
            <tr>
              <td>Technical data</td>
              <td>
                When you last used the app, login times, a record of important actions (for example who confirmed a payment), and, if you turn on alerts, a
                notification address for your phone or browser.
              </td>
            </tr>
            <tr>
              <td>Website forms</td>
              <td>What you send us through the waitlist or contact form.</td>
            </tr>
          </tbody>
        </table>
      ),
    },
    {
      id: 'not',
      title: 'What we do not collect',
      body: (
        <ul>
          <li>We do not track your GPS location. Alerts show your house number, not where your phone is.</li>
          <li>We do not collect your BVN, NIN or card numbers.</li>
          <li>We do not use advertising or tracking cookies, and we do not sell personal data to anyone.</li>
          <li>
            The app stores your login session and settings (such as night mode) on your device so you stay signed in. These are needed for the app to
            work.
          </li>
        </ul>
      ),
    },
    {
      id: 'why',
      title: 'Why we use it, and our legal basis',
      body: (
        <>
          <p>Under the Nigeria Data Protection Act 2023 we must have a lawful basis for each use:</p>
          <ul>
            <li>
              <strong>To run the service you or your estate signed up for</strong> (accounts, visitor passes, alerts, bills): performance of a contract.
            </li>
            <li>
              <strong>To protect people in an emergency</strong> (sending your alert, name, house number and phone to your estate’s guards and admins,
              and to police officers only if your estate has added them to NexHood): protecting vital interests, and our legitimate interest in keeping
              estates safe.
            </li>
            <li>
              <strong>To keep the service secure and prevent misuse</strong> (logs, rate limits, fraud checks): legitimate interests.
            </li>
            <li>
              <strong>To keep financial records and meet legal duties</strong> (tax, accounting, lawful requests from authorities): legal obligation.
            </li>
            <li>
              <strong>Optional things</strong> (push notifications on your phone, the waitlist, product news): your consent, which you can withdraw at any
              time.
            </li>
          </ul>
          <p>We do not make decisions about you using only automated means.</p>
        </>
      ),
    },
    {
      id: 'who-sees',
      title: 'Who can see what',
      body: (
        <>
          <ul>
            <li>
              <strong>Inside your estate,</strong> people see only what their role needs. Guards see visitor passes, alerts and incidents. Guards and
              police contacts never see bills, payments or estate finances. Residents see their own bills and the estate’s spending statement.
            </li>
            <li>
              <strong>Service providers</strong> who help us run NexHood, under contracts that require them to protect your data:
              <ul>
                <li>Render (servers, European Union)</li>
                <li>MongoDB Atlas (database, {LEGAL.databaseRegion})</li>
                <li>Vercel (website delivery, global)</li>
                <li>Resend (sending emails, United States)</li>
                <li>Paystack (payments, Nigeria)</li>
                <li>Apple, Google and Mozilla (delivering phone and browser notifications)</li>
              </ul>
            </li>
            <li>
              <strong>Authorities,</strong> only when the law requires it or to protect someone’s life. Where we lawfully can, we will tell your estate.
            </li>
          </ul>
          <p>We do not sell or rent personal data.</p>
        </>
      ),
    },
    {
      id: 'abroad',
      title: 'Data stored outside Nigeria',
      body: (
        <p>
          Some of our providers store data outside Nigeria (see the list above). When that happens we rely on safeguards allowed by the Nigeria Data
          Protection Act, such as the providers’ data protection agreements and standard contractual clauses, and, when you create or accept your
          account, your consent. Data is encrypted while it travels over the internet.
        </p>
      ),
    },
    {
      id: 'keep',
      title: 'How long we keep it',
      body: (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Kept for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account details</td>
              <td>While your account is active. Deleted or anonymised within 90 days after it is closed, unless the law requires longer.</td>
            </tr>
            <tr>
              <td>Visitor passes</td>
              <td>12 months after the visit.</td>
            </tr>
            <tr>
              <td>Login records</td>
              <td>12 months.</td>
            </tr>
            <tr>
              <td>Alerts and incidents</td>
              <td>3 years, because they can be needed as evidence. Your estate can ask for earlier deletion.</td>
            </tr>
            <tr>
              <td>Bills, payments and estate accounts</td>
              <td>6 years, to meet accounting and tax rules.</td>
            </tr>
            <tr>
              <td>Posts, repairs and photos</td>
              <td>Until deleted by you or your estate, or until the estate stops using NexHood.</td>
            </tr>
          </tbody>
        </table>
      ),
    },
    {
      id: 'rights',
      title: 'Your rights',
      body: (
        <>
          <p>Under the Nigeria Data Protection Act 2023 you can:</p>
          <ul>
            <li>ask for a copy of the personal data we hold about you;</li>
            <li>ask us to correct it;</li>
            <li>ask us to delete it, or to restrict how we use it;</li>
            <li>object to how we use it;</li>
            <li>ask for your data in a format you can take elsewhere;</li>
            <li>withdraw consent at any time (for example, turn off notifications in Settings).</li>
          </ul>
          <p>
            Email {mail(LEGAL.privacyEmail)}. We reply within 30 days. Some records (such as payments or an alert under investigation) may need to be kept
            for legal reasons; if so, we will tell you why.
          </p>
          <p>
            If you are not happy with our answer, you can complain to the <strong>Nigeria Data Protection Commission</strong> (ndpc.gov.ng).
          </p>
        </>
      ),
    },
    {
      id: 'security',
      title: 'How we protect it',
      body: (
        <>
          <ul>
            <li>Passwords are stored scrambled (hashed), never in plain text.</li>
            <li>All traffic between your phone and NexHood is encrypted (HTTPS).</li>
            <li>Each role only sees what it needs, and every important action is recorded.</li>
            <li>Changing your password signs you out on your other devices.</li>
          </ul>
          <p>
            No system is perfectly secure. If a breach puts your rights at risk, we will inform the Nigeria Data Protection Commission within 72 hours of
            becoming aware of it, and tell your estate and you as quickly as we can, with what happened and what to do.
          </p>
        </>
      ),
    },
    {
      id: 'children',
      title: 'Children',
      body: (
        <p>
          NexHood accounts are for adults (18 and over). We do not knowingly create accounts for children. A parent or guardian can create visitor
          passes for their household. If you think a child has an account, contact us and we will remove it.
        </p>
      ),
    },
    {
      id: 'visitors',
      title: 'If you are a visitor',
      body: (
        <p>
          If a resident created a pass for you, we hold your name, phone number and visit times so the gate can let you in, on behalf of that estate. You
          can contact us at {mail(LEGAL.privacyEmail)} to ask about or delete your details.
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: (
        <p>
          We will update this page when our practices change and change the date at the top. If a change is important, we will tell you in the app and
          ask you to agree again. See also our <Link to="/terms">Terms of Service</Link>.
        </p>
      ),
    },
  ]

  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains, in plain language, what personal data NexHood collects, why, who sees it, how long we keep it and the rights you have
          under the <strong>Nigeria Data Protection Act 2023</strong>.
        </p>
      }
      sections={sections}
    />
  )
}
