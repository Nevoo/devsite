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

Thank you for visiting rouvens work (the "Website").
Your privacy is important to me, and I am committed to protecting your personal information. 
This Privacy Policy outlines the types of information collected when you visit our Website, 
how I use and protect that information, and your rights regarding your personal data.

As the owner and operator of rouvens work, I prioritize privacy and data compliance. 
I utilize Vercel Web Analytics to gather insights about website traffic while ensuring user privacy.

Data collected:
Vercel Analytics: To enhance our website, we use Vercel Web Analytics. 
These tools collect aggregated data to provide insights into website usage and performance, with no individual visitor identification. 
For more information on Vercel's data practices, please refer to their privacy policies:
    `}
                    </pre>
                    <div
                        style={{
                            fontFamily: "Inter",
                            textAlign: "left",
                        }}
                    >
                        <a href="https://vercel.com/docs/analytics/privacy-policy">
                            Vercel Web Analytics Privacy and Compliance
                        </a>
                    </div>
                    <pre
                        style={{
                            fontFamily: "Inter",
                            textAlign: "left",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                        }}
                    >
                        {`
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
