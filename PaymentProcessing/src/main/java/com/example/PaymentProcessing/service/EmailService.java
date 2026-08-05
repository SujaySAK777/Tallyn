package com.example.PaymentProcessing.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean sendOtp(String toEmail, String otp, String purpose) {
        if (fromAddress == null || fromAddress.isBlank()) {
            log.warn("Mail sender not configured (GMAIL_USERNAME/GMAIL_APP_PASSWORD missing); OTP for {} not sent: {}", toEmail, otp);
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject("Tallyn verification code");
            message.setText("Your Tallyn verification code for " + purpose + " is: " + otp
                + "\n\nThis code expires shortly. If you did not request this, you can ignore this email.");
            mailSender.send(message);
            return true;
        } catch (Exception ex) {
            log.error("Failed to send OTP email to {}", toEmail, ex);
            return false;
        }
    }

    public void sendMoneyDeductedEmail(String toEmail, String accountHolderName, String amount,
                                        String recipientName, String referenceNumber, String remainingBalance) {
        send(toEmail, "Money debited from your Tallyn account",
                "Hi " + accountHolderName + ",\n\n"
                        + "Rs. " + amount + " was debited from your account and sent to " + recipientName + ".\n"
                        + "Reference number: " + referenceNumber + "\n"
                        + "Remaining balance: Rs. " + remainingBalance + "\n\n"
                        + "If you did not authorize this transaction, please contact support immediately.");
    }

    public void sendMoneyReceivedEmail(String toEmail, String accountHolderName, String amount,
                                        String senderName, String referenceNumber, String availableBalance) {
        send(toEmail, "Money credited to your Tallyn account",
                "Hi " + accountHolderName + ",\n\n"
                        + "Rs. " + amount + " was credited to your account from " + senderName + ".\n"
                        + "Reference number: " + referenceNumber + "\n"
                        + "Available balance: Rs. " + availableBalance);
    }

    public void sendPaymentFailedEmail(String toEmail, String accountHolderName, String amount,
                                        String reason, String referenceNumber) {
        send(toEmail, "Your Tallyn payment failed",
                "Hi " + accountHolderName + ",\n\n"
                        + "Your payment of Rs. " + amount + " (reference " + referenceNumber + ") could not be completed.\n"
                        + "Reason: " + reason + "\n\n"
                        + "No amount has been deducted. Please try again or contact support if the issue persists.");
    }

    public void sendPaymentScheduledEmail(String toEmail, String accountHolderName, String amount,
                                           String scheduledAt, String referenceNumber) {
        send(toEmail, "Payment scheduled on Tallyn",
                "Hi " + accountHolderName + ",\n\n"
                        + "Your payment of Rs. " + amount + " has been scheduled for " + scheduledAt + ".\n"
                        + "Reference number: " + referenceNumber);
    }

    private void send(String toEmail, String subject, String body) {
        if (fromAddress == null || fromAddress.isBlank()) {
            log.warn("Mail sender not configured (GMAIL_USERNAME/GMAIL_APP_PASSWORD missing); email to {} not sent: {}", toEmail, subject);
            return;
        }
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("No recipient email available; email not sent: {}", subject);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send email to {}", toEmail, ex);
        }
    }
}
