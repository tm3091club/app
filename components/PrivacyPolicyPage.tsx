import React from 'react';

export const PrivacyPolicyPage: React.FC = () => {
  const handleBack = () => {
    window.location.hash = '#';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
          </div>
          
          <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Effective date: October 6, 2025</p>
            
            <p className="mb-6">
              Your privacy is very important to us. We ask for personal information only when we truly need it to provide the Service, we do not share personal information except as described in this Policy to comply with law, operate and improve the Service, or protect our rights, and we do not retain personal information longer than is necessary for the ongoing operation of the Service and our legal obligations.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Website visitors and usage data</h2>
            <p className="mb-6">
              Like most online services, we collect non-personally identifying information that browsers, apps, and servers typically make available, including browser or device type, language preference, referring URL, pages or screens viewed, the date and time of requests, and general interaction data. We use this information to understand how visitors and members use the Service, to maintain security, and to improve performance and features. We may publish aggregated, de-identified statistics about Service usage, provided that the statistics do not identify an individual.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">IP addresses and similar identifiers</h2>
            <p className="mb-6">
              We collect Internet Protocol (IP) addresses and related network metadata when you access the Service, including when signed in. We use this information for security, fraud prevention, abuse detection, localization, and diagnostics. Where required by law, we treat IP addresses as personal data and handle them accordingly. We disclose IP addresses only as permitted in this Policy.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Information you provide to us</h2>
            <p className="mb-6">
              You may provide personal information when you create an account, join or manage a club space, update your profile, configure availability, create or edit schedules, coordinate mentorship relationships, send messages or notes, or contact support. The information may include your name, email address, club affiliation, role assignments, availability, mentorship pairings and related notes, and communication preferences. You may refuse to provide certain information, but doing so may limit your ability to use some features.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Information created or received in the Service</h2>
            <p className="mb-6">
              When clubs use the Service, we process "Club Data," which can include member rosters, availability, meeting schedules, role assignments, mentorship pairings, mentorship goals or checkpoints, and notes. Club administrators and other authorized users control the creation and sharing of Club Data within their club space. We process Club Data to provide, secure, and improve the Service, and we handle it in accordance with this Policy and our Terms.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Cookies and similar technologies</h2>
            <p className="mb-6">
              We use cookies and similar technologies to operate and secure the Service, remember preferences, enable sign-in, and measure usage. You may control cookies through your browser or device settings. Refusing cookies may affect the availability or functionality of certain features. Where required, we will request your consent for non-essential cookies.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">View-only share links</h2>
            <p className="mb-6">
              Authorized users may generate view-only schedule links that can be distributed outside the Service. Anyone who has a share link can view the associated content. To reduce unintended exposure, share links are deleted every thirty (30) days, after which the links no longer function. Copies or forwards of links or content outside the Service are beyond our control, and you are responsible for how you distribute any link you create or receive.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">How we use personal information</h2>
            <p className="mb-6">
              We use personal information to provide, operate, and improve the Service; to authenticate accounts and maintain security; to create, host, and display schedules and mentorship information as configured by authorized users; to send operational and transactional communications such as role reminders, schedule updates, account notices, and support responses; to analyze usage and performance; to detect, prevent, and address fraud, abuse, and violations of our Terms; and to comply with legal obligations. We may de-identify or aggregate information and use or disclose such information for analytics, research, and Service improvement.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">How we share personal information</h2>
            <p className="mb-6">
              We disclose personal information to service providers and contractors who process information on our behalf to deliver hosting, authentication, databases, communications delivery, analytics, security, and customer support, under agreements that require confidentiality and appropriate data protection. We disclose information when required by law, subpoena, or legal process, or when we believe in good faith that disclosure is reasonably necessary to protect the rights, property, or safety of TMS, our users, or the public. We may share de-identified or aggregated information that does not identify an individual. Content you submit to a club space may be visible to other authorized users of that space as configured by your club.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">International transfers</h2>
            <p className="mb-6">
              We may process and store information in countries other than your country of residence. These countries may have data-protection laws that are different from those in your jurisdiction. Where required, we implement appropriate safeguards for international transfers, such as standard contractual clauses or other lawful transfer mechanisms.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Security</h2>
            <p className="mb-6">
              We implement technical and organizational measures designed to protect personal information from unauthorized access, disclosure, alteration, or destruction. No method of transmission or storage is completely secure, and we cannot guarantee absolute security. You are responsible for safeguarding your account credentials and restricting access to your devices.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Data retention</h2>
            <p className="mb-6">
              We retain personal information for as long as necessary to provide the Service, to comply with legal obligations, to resolve disputes, to enforce agreements, and to maintain business records. We consider the nature and sensitivity of the data, the potential risk of harm from unauthorized use or disclosure, the purposes of processing, and applicable legal requirements. View-only share links are deleted every thirty (30) days as described above.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your choices</h2>
            <p className="mb-6">
              You may update certain account information through your account settings. You may opt out of non-essential emails where such options are provided; certain administrative or security notices are intrinsic to the Service and may continue. You may control cookies through your browser or device settings and, where available, through in-product controls.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your rights</h2>
            <p className="mb-6">
              Depending on your location, you may have rights to request access to personal information, to request correction or deletion, to object to or restrict processing, and to request data portability. Where processing is based on consent, you may withdraw consent at any time without affecting the lawfulness of processing before withdrawal. We may take reasonable steps to verify your identity before fulfilling a request and may deny requests where an exception applies. You may lodge a complaint with a data protection authority in your place of residence, place of work, or place of alleged infringement.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Legal bases for processing</h2>
            <p className="mb-6">
              Where required by law, we process personal data on the basis of the performance of a contract with you; our legitimate interests in operating, improving, and securing the Service; compliance with legal obligations; and your consent where applicable.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Children's privacy</h2>
            <p className="mb-6">
              The Service is not directed to children who are not legally permitted to use the Service in their jurisdiction without parental authorization. We do not knowingly collect personal information from ineligible children. If you believe a child has provided personal information in violation of this Policy, please contact us so that we can take appropriate steps.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Third-party links and services</h2>
            <p className="mb-6">
              The Service may include links to third-party websites or allow access to third-party services. We are not responsible for the privacy practices of third parties, and your use of those services is subject to their privacy policies.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ads</h2>
            <p className="mb-6">
              We do not currently display third-party advertising in the Service. If this changes, advertising partners may use cookies or similar technologies to deliver and measure ads as permitted by law and, where required, subject to your consent. This Policy would continue to apply to our use of cookies, and advertisers' policies would govern their use of tracking technologies.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Business transfers</h2>
            <p className="mb-6">
              If TMS is involved in a merger, acquisition, reorganization, sale of assets, insolvency, or similar event, personal information may be transferred to a successor or assign. The successor's use of your information will remain subject to this Policy unless and until it is replaced with a successor policy with notice to you where required by law.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Do Not Track and preference signals</h2>
            <p className="mb-6">
              The Service does not respond to browser "Do Not Track" signals. We will honor legally recognized opt-out preference signals where required by applicable law and where technically feasible.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Changes to this Policy</h2>
            <p className="mb-6">
              We may revise this Privacy Policy from time to time. If we make material changes, we will update the effective date and provide notice through the Service or by email where required. Your continued use of the Service after the updated Policy becomes effective constitutes your acknowledgment of the changes.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">How to contact us</h2>
            <p className="mb-6">
              You may contact us with privacy questions or requests using the method provided at tmapp.club. Please include enough information for us to identify your account and understand your request, and we will respond in accordance with applicable law.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
