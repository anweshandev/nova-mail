import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

/**
 * SMTP Service - Handles all email sending operations
 */
export class SmtpService {
  constructor(config) {
    this.config = {
      host: config.host,
      port: config.port || 587,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    };
    
    this.userEmail = config.user;
    this.userName = config.name || config.user.split('@')[0];
  }

  /**
   * Create the nodemailer transport
   */
  createTransport() {
    return nodemailer.createTransport(this.config);
  }

  /**
   * Verify SMTP connection and credentials
   */
  async verify() {
    const transport = this.createTransport();
    await transport.verify();
    return true;
  }

  /**
   * Send an email
   */
  async sendEmail(emailData) {
    const transport = this.createTransport();
    
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      textBody,
      attachments,
      replyTo,
      inReplyTo,
      references,
    } = emailData;

    // Format recipients
    const formatRecipients = (recipients) => {
      if (!recipients || recipients.length === 0) return undefined;
      return recipients.map(r => {
        if (typeof r === 'string') return r;
        return r.name ? `"${r.name}" <${r.email}>` : r.email;
      });
    };

    // Format attachments for nodemailer
    const formattedAttachments = (attachments || []).map(att => {
      if (att.content) {
        // Base64 encoded content
        return {
          filename: att.filename || att.name,
          content: att.content,
          encoding: 'base64',
          contentType: att.contentType || att.type,
        };
      }
      if (att.path) {
        // File path
        return {
          filename: att.filename || att.name,
          path: att.path,
        };
      }
      return null;
    }).filter(Boolean);

    const mailOptions = {
      from: `"${this.userName}" <${this.userEmail}>`,
      to: formatRecipients(to),
      cc: formatRecipients(cc),
      bcc: formatRecipients(bcc),
      subject: subject || '(no subject)',
      html: body,
      text: textBody || this.stripHtml(body),
      attachments: formattedAttachments,
      replyTo: replyTo,
      inReplyTo: inReplyTo,
      references: references,
      messageId: `<${uuidv4()}@${this.userEmail.split('@')[1]}>`,
    };

    const result = await transport.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
    };
  }

  /**
   * Send a reply to an email
   */
  async sendReply(originalEmail, replyData) {
    const { body, textBody, attachments, replyAll } = replyData;
    
    // Build recipients list
    const to = [{ email: originalEmail.from.email, name: originalEmail.from.name }];
    let cc = [];
    
    if (replyAll) {
      // Add all original recipients except self
      const otherRecipients = (originalEmail.to || [])
        .filter(r => r.email !== this.userEmail);
      const otherCc = (originalEmail.cc || [])
        .filter(r => r.email !== this.userEmail);
      
      cc = [...otherRecipients, ...otherCc];
    }
    
    // Build subject
    let subject = originalEmail.subject || '';
    if (!subject.toLowerCase().startsWith('re:')) {
      subject = `Re: ${subject}`;
    }
    
    // Build references chain
    const references = originalEmail.references 
      ? `${originalEmail.references} ${originalEmail.messageId}`
      : originalEmail.messageId;

    return this.sendEmail({
      to,
      cc,
      subject,
      body,
      textBody,
      attachments,
      inReplyTo: originalEmail.messageId,
      references,
    });
  }

  /**
   * Forward an email
   */
  async forwardEmail(originalEmail, forwardData) {
    const { to, cc, bcc, body, attachments: additionalAttachments } = forwardData;
    
    // Build subject
    let subject = originalEmail.subject || '';
    if (!subject.toLowerCase().startsWith('fwd:')) {
      subject = `Fwd: ${subject}`;
    }
    
    // Build forwarded message body
    const forwardedBody = `
      ${body || ''}
      <br><br>
      <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px;">
        <p><strong>---------- Forwarded message ---------</strong></p>
        <p><strong>From:</strong> ${originalEmail.from.name} &lt;${originalEmail.from.email}&gt;</p>
        <p><strong>Date:</strong> ${new Date(originalEmail.date).toLocaleString()}</p>
        <p><strong>Subject:</strong> ${originalEmail.subject}</p>
        <p><strong>To:</strong> ${(originalEmail.to || []).map(r => r.email).join(', ')}</p>
        <br>
        ${originalEmail.body}
      </div>
    `;
    
    // Combine attachments
    const allAttachments = [
      ...(originalEmail.attachments || []),
      ...(additionalAttachments || []),
    ];

    return this.sendEmail({
      to,
      cc,
      bcc,
      subject,
      body: forwardedBody,
      attachments: allAttachments,
    });
  }

  /**
   * Save email as draft (returns raw RFC822 message)
   */
  buildDraftMessage(draftData) {
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      textBody,
    } = draftData;

    const formatRecipients = (recipients) => {
      if (!recipients || recipients.length === 0) return '';
      return recipients.map(r => {
        if (typeof r === 'string') return r;
        return r.name ? `"${r.name}" <${r.email}>` : r.email;
      }).join(', ');
    };

    const boundary = `----=_Part_${uuidv4()}`;
    const date = new Date().toUTCString();
    
    let message = `From: "${this.userName}" <${this.userEmail}>\r\n`;
    message += `To: ${formatRecipients(to)}\r\n`;
    if (cc?.length) message += `Cc: ${formatRecipients(cc)}\r\n`;
    if (bcc?.length) message += `Bcc: ${formatRecipients(bcc)}\r\n`;
    message += `Subject: ${subject || ''}\r\n`;
    message += `Date: ${date}\r\n`;
    message += `Message-ID: <${uuidv4()}@${this.userEmail.split('@')[1]}>\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    message += `\r\n`;
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/plain; charset="UTF-8"\r\n`;
    message += `\r\n`;
    message += `${textBody || this.stripHtml(body || '')}\r\n`;
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/html; charset="UTF-8"\r\n`;
    message += `\r\n`;
    message += `${body || ''}\r\n`;
    message += `--${boundary}--\r\n`;
    
    return message;
  }

  /**
   * Strip HTML tags to get plain text
   */
  stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

/**
 * Create an SMTP service instance from user credentials
 */
export function createSmtpService(credentials) {
  return new SmtpService({
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    pass: credentials.pass,
    name: credentials.name,
  });
}
