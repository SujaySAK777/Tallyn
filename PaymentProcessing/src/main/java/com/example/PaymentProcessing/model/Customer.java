package com.example.PaymentProcessing.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer")
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "customer_id") private Long customerId;
    @Column(nullable = false, unique = true) private String email;
    @Column(name = "password_hash", nullable = false) private String passwordHash;
    @Column(name = "phone_number") private String phoneNumber;
    @Column(name = "first_name") private String firstName;
    @Column(name = "last_name") private String lastName;
    @Column(name = "onboarding_status", nullable = false) private String onboardingStatus;
    @Column(name = "email_verified_at") private LocalDateTime emailVerifiedAt;
    @Column(name = "created_at", insertable = false, updatable = false) private LocalDateTime createdAt;
    public Long getCustomerId() { return customerId; } public String getEmail() { return email; } public void setEmail(String v) { email=v; }
    public String getPasswordHash() { return passwordHash; } public void setPasswordHash(String v) { passwordHash=v; }
    public String getPhoneNumber() { return phoneNumber; } public void setPhoneNumber(String v) { phoneNumber=v; }
    public String getFirstName() { return firstName; } public void setFirstName(String v) { firstName=v; }
    public String getLastName() { return lastName; } public void setLastName(String v) { lastName=v; }
    public String getOnboardingStatus() { return onboardingStatus; } public void setOnboardingStatus(String v) { onboardingStatus=v; }
    public LocalDateTime getEmailVerifiedAt() { return emailVerifiedAt; } public void setEmailVerifiedAt(LocalDateTime v) { emailVerifiedAt=v; }
}
