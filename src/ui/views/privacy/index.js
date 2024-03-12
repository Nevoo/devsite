import { useThree } from "@react-three/fiber";
import { CameraView } from "../../../routing/camera-view";
import { MobileScrollWrapper } from "../about/about-page";
// import "./index.css";

export const Privacy = () => {
    const { width, height } = useThree((state) => state.size);

    return (
        <CameraView isFloating={false}>
            <MobileScrollWrapper pages={"4"}>
                <div
                    className="body"
                    style={{
                        backgroundColor: "#eff0f3",
                        width: width > 1200 ? "100vw" : "unset",
                    }}
                >
                    <pre
                        style={{
                            fontFamily: "Inter",
                            textAlign: "left",
                            paddingTop: "150px",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                        }}
                    >
                        {`Privacy Policy for rouvens work

Effective Date: 01.03.2024

Thank you for visiting rouvens work (the "Website"), owned and operated by Rouven Lührs. 
Your privacy is important to me, and I am committed to protecting your personal information. 
This Privacy Policy outlines the types of information collected when you visit our Website, 
how I use and protect that information, and your rights regarding your personal data.

As the owner and operator of rouvens work, I prioritize privacy and data compliance. 
I utilize Vercel Web Analytics to gather insights about website traffic while ensuring user privacy.

Data collected:
Vercel Web Analytics operates globally and aligns with leading data protection standards.
It anonymizes data points such as pageviews and custom events, ensuring no personal identifiers are collected. 
The recorded data points, including:

    - Event Timestamp: 2020-10-29 09:06:30
    - URL: /blog/nextjs-10
    - Dynamic Path: /blog/[slug]
    - Referrer: https://twitter.com/
    - Query Params (Filtered): ?ref=hackernews
    - Geolocation: US, California, San Francisco
    - Device OS & Version: Android 10
    - Browser & Version: Chrome 86 (Blink)
    - Device Type: Mobile (or Desktop/Tablet)
    - Web Analytics Script Version: 1.0.0

Visitor identification and data storage:
Vercel Web Analytics identifies visitors using a hash created from the incoming request, ensuring privacy without third-party cookies. 
Visitor session data is automatically discarded after 24 hours. 
All page views, including fresh loads and client-side transitions, are tracked without storing personally identifiable information.

Purpose of Data Collection:
The non-personal data I collect is used for web analytics purposes only. 
I use this information to track user activity and improve the functionality and performance of our Website.

Data Sharing:
I do not share any data collected from our Website with third parties.
All data collected is used solely for internal analytics purposes.

Children's Privacy:
I do not knowingly collect any personal information from children under the age of 13.
Our Website is not intended for use by children, and I do not target or market to individuals under the age of 13.

Updates to the Privacy Policy:
This Privacy Policy may be updated periodically to reflect changes in our privacy practices.
I will notify users of any material changes by posting the updated Privacy Policy on our Website.
Your continued use of the Website after the posting of changes constitutes your acceptance of such changes.

Contact Information:
If you have any questions or concerns about this Privacy Policy or our privacy practices, please contact me at [rouven@luehrs.dev].

By using our Website, you consent to the collection and use of non-personal data as described in this Privacy Policy.
If you do not agree with the terms of this Policy, please do not use our Website.
`}
                    </pre>
                </div>
            </MobileScrollWrapper>
        </CameraView>
    );
};
