
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailNotificationRequest {
  to: string;
  type: 'match_request' | 'photo_request' | 'match_accepted' | 'photo_accepted' | 'success_story' | 
        'match_removed' | 'match_removed_confirmation' | 'potential_match' | 'affiliate_commission' | 
        'affiliate_payout' | 'payment_reminder' | 'inactivity_reminder_3day' | 'inactivity_reminder_7day' |
        'inactivity_reminder_30day' | 'incomplete_onboarding_2day' | 'incomplete_onboarding_7day';
  senderName?: string;
  recipientName?: string;
  subject?: string;
  storyData?: {
    name: string;
    email: string;
    partnerName: string;
    marriageDate: string;
    story: string;
  };
  matchData?: {
    id: string;
    firstName: string;
    age: number;
    country: string;
    profession?: string;
    ethnicity?: string[];
    height?: number;
  };
  commissionData?: {
    amount: string;
    referredName?: string;
    planType?: string;
  };
  payoutData?: {
    amount: string;
    period: string;
    method: string;
  };
}

const getEmailContent = (type: string, senderName: string = 'Someone', recipientName: string = 'there', storyData?: any, matchData?: any, commissionData?: any, payoutData?: any) => {
  switch (type) {
    case 'match_request':
      return {
        subject: "💌 New Match Request on NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">New Match Request</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p><strong>${senderName}</strong> has sent you a match request on NikkahFirst.</p>
            <p>Log in to your account to view this request and decide whether to accept or decline.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Request</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'photo_request':
      return {
        subject: "📸 New Photo Reveal Request on NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Photo Reveal Request</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p><strong>${senderName}</strong> has requested to view your photos on NikkahFirst.</p>
            <p>Log in to your account to review this request and decide whether to approve or decline.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/photo-requests" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Request</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'match_accepted':
      return {
        subject: "🎉 Your Match Request was Accepted on NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Match Request Accepted!</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>Great news! <strong>${senderName}</strong> has accepted your match request on NikkahFirst.</p>
            <p>You can now view their contact information and continue your conversation off-platform.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/matches" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Matches</a>
            </div>
            <p>May Allah bless this potential relationship.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'photo_accepted':
      return {
        subject: "👀 Your Photo Reveal Request was Approved on NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Photo Reveal Approved!</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p><strong>${senderName}</strong> has approved your request to view their photos on NikkahFirst.</p>
            <p>Log in to your account to view their profile photos.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Profile</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'match_removed':
      return {
        subject: "❌ Match has been removed on NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Match Removed</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p><strong>${senderName}</strong> has decided to unmatch with you on NikkahFirst.</p>
            <p>We understand this may be disappointing, but Allah's plan is always the best plan.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Continue Your Search</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'match_removed_confirmation':
      return {
        subject: "❌ Match removal confirmation from NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Match Removal Confirmed</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>This email confirms that you have unmatched with another user on NikkahFirst.</p>
            <p>The other user has been notified of this change.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Return to Dashboard</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'success_story':
      return {
        subject: "Success Story Submission from NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">New Success Story Submission</h1>
            <p>A new success story has been submitted from the NikkahFirst website:</p>
            
            <div style="background-color: #f9f9f9; border-left: 4px solid #e91e63; padding: 15px; margin: 20px 0;">
              <p><strong>Name:</strong> ${storyData.name}</p>
              <p><strong>Email:</strong> ${storyData.email}</p>
              <p><strong>Partner's Name:</strong> ${storyData.partnerName}</p>
              <p><strong>Marriage Date:</strong> ${storyData.marriageDate}</p>
              <p><strong>Their Story:</strong></p>
              <p style="white-space: pre-line;">${storyData.story}</p>
            </div>
            
            <p>You may want to follow up with them regarding their special gift!</p>
            <p>Best regards,<br>NikkahFirst Notification System</p>
          </div>
        `,
      };
    case 'potential_match':
      const ethnicityDisplay = matchData?.ethnicity?.join(', ') || 'Not specified';
      const heightDisplay = matchData?.height ? `${Math.floor(matchData.height / 100)}m ${matchData.height % 100}cm` : 'Not specified';
      const professionDisplay = matchData?.profession || 'Not specified';
      
      return {
        subject: "✨ We Found a Potential Match For You on NikkahFirst!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Potential Match Found!</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>We've found a profile that matches your preferences on NikkahFirst!</p>
            
            <div style="background-color: #f9f9f9; border-left: 4px solid #e91e63; padding: 15px; margin: 20px 0;">
              <h3 style="color: #e91e63; margin-top: 0;">Meet ${matchData.firstName}</h3>
              <p><strong>Age:</strong> ${matchData.age} years</p>
              <p><strong>Country:</strong> ${matchData.country}</p>
              <p><strong>Ethnicity:</strong> ${ethnicityDisplay}</p>
              <p><strong>Height:</strong> ${heightDisplay}</p>
              <p><strong>Profession:</strong> ${professionDisplay}</p>
            </div>
            
            <p>This profile matches your preferences and might be worth exploring!</p>
            
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/profile/${matchData.id}" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Profile</a>
            </div>
            
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'affiliate_commission':
      return {
        subject: "💰 You've Earned a Commission on NikkahFirst!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">New Commission Earned!</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>Great news! You've earned a commission of <strong>${commissionData?.amount || '£0.00'}</strong> on NikkahFirst.</p>
            ${commissionData?.referredName ? `<p>A user you referred (${commissionData.referredName}) has subscribed to ${commissionData.planType || 'a premium plan'}.</p>` : `<p>A user you referred has subscribed to a premium plan.</p>`}
            <p>Your commission has been added to your affiliate balance and will be included in your next payout.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/affiliate/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Your Dashboard</a>
            </div>
            <p>Thank you for partnering with us to help Muslims find their perfect match!</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'affiliate_payout':
      return {
        subject: "💸 Your NikkahFirst Affiliate Payout is on the Way!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Affiliate Payout Processed</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>We're pleased to inform you that we've processed your affiliate payout of <strong>${payoutData?.amount || '£0.00'}</strong> for the period ${payoutData?.period || 'recent'}.</p>
            <p>The payment has been sent via ${payoutData?.method || 'your preferred payment method'} and should be reflected in your account shortly.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/affiliate/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Payment Details</a>
            </div>
            <p>Thank you for your continued partnership with NikkahFirst!</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'payment_reminder':
      return {
        subject: "🔔 Complete Your NikkahFirst Journey",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Complete Your Profile Access</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>We noticed you recently created your profile on NikkahFirst - that's a great first step in your journey to finding a spouse!</p>
            <p>To start connecting with potential matches, you'll need to complete your subscription. This will give you:</p>
            <ul style="list-style-type: none; padding-left: 0; margin: 20px 0;">
              <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                ✨ <span style="margin-left: 5px;">Access to view all profiles</span>
              </li>
              <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                ✨ <span style="margin-left: 5px;">Ability to send match requests</span>
              </li>
              <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                ✨ <span style="margin-left: 5px;">Request to view photos</span>
              </li>
            </ul>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/pricing" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Subscription</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    // NEW TEMPLATES FOR INACTIVITY REMINDER EMAILS
    case 'inactivity_reminder_3day':
      return {
        subject: "👋 We Miss You on NikkahFirst!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">New Potential Matches Waiting</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>We noticed it's been 3 days since you last visited NikkahFirst. We've had new members join who might be perfect for you!</p>
            <p>Take a few minutes to check out the new profiles that match your preferences.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Explore New Profiles</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'inactivity_reminder_7day':
      return {
        subject: "💞 Your Perfect Match Might Be Waiting on NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Don't Miss Your Opportunity</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>It's been a week since you last checked NikkahFirst. Your perfect match could be waiting for you!</p>
            <p>Our community continues to grow with dedicated Muslims looking for marriage. Don't miss the chance to connect with someone special.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Return to NikkahFirst</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'inactivity_reminder_30day':
      return {
        subject: "🎉 Did You Find Your Spouse on NikkahFirst? 💍",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Did You Find Success? 💝</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>It's been a month since we last saw you on NikkahFirst! We're curious - have you found your special someone? 💕</p>
            <p>If you've gotten married, we'd love to hear your story! We send special gifts to our successful couples. 🎁</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/success-story" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Share Your Success Story</a>
            </div>
            <p>If you're still searching, we'd love to welcome you back. We have many new members who might be perfect for you!</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/dashboard" style="background-color: #6772e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Continue Your Search</a>
            </div>
            <p>May Allah bless you in your journey!</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    // NEW TEMPLATES FOR INCOMPLETE ONBOARDING REMINDER EMAILS
    case 'incomplete_onboarding_2day':
      return {
        subject: "✨ Complete Your NikkahFirst Profile and Find Your Match!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Just a Few Steps Away!</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>Thank you for starting your journey with NikkahFirst! We noticed that you haven't completed your profile setup yet.</p>
            <p>With a complete profile, you'll be able to:</p>
            <ul style="list-style-type: none; padding-left: 0; margin: 20px 0;">
              <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                ✨ <span style="margin-left: 5px;">Be discoverable by potential matches</span>
              </li>
              <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                ✨ <span style="margin-left: 5px;">Find profiles that match your preferences</span>
              </li>
              <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                ✨ <span style="margin-left: 5px;">Begin meaningful conversations</span>
              </li>
            </ul>
            <p>It only takes a few minutes to complete your profile and start your journey to finding a spouse!</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/onboarding" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Your Profile</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    case 'incomplete_onboarding_7day':
      return {
        subject: "🔔 Last Step to Find Your Match on NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Don't Miss Out on Your Perfect Match!</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>We noticed you started creating your NikkahFirst profile a week ago but haven't completed the setup process.</p>
            <p>Many potential matches are waiting to discover you, but they can only do so once your profile is complete.</p>
            <p>Hundreds of Muslims have already found their spouses through NikkahFirst. You could be next!</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/onboarding" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Your Profile Now</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
    default:
      return {
        subject: "📢 Notification from NikkahFirst",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Notification</h1>
            <p>Assalamu alaikum ${recipientName},</p>
            <p>You have a new notification on NikkahFirst.</p>
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Notification</a>
            </div>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received email notification request");
    const { to, type, senderName, recipientName, subject, storyData, matchData, commissionData, payoutData }: EmailNotificationRequest = await req.json();
    console.log(`Request data: to=${to}, type=${type}, senderName=${senderName}, recipientName=${recipientName}`);

    if (!to || !type) {
      console.error("Missing required fields: to, type");
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailContent = getEmailContent(type, senderName, recipientName, storyData, matchData, commissionData, payoutData);
    const emailSubject = subject || emailContent.subject;
    console.log(`Email content generated: subject=${emailSubject}`);

    const emailResponse = await resend.emails.send({
      from: "NikkahFirst <info@nikkahfirst.com>", 
      to: [to],
      subject: emailSubject,
      html: emailContent.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
