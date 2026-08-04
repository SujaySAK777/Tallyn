package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.CreateGroupSplitRequest;
import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.GroupSplitMemberRequest;
import com.example.PaymentProcessing.api.GroupSplitMemberResponse;
import com.example.PaymentProcessing.api.GroupSplitNotificationResponse;
import com.example.PaymentProcessing.api.GroupSplitResponse;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.Customer;
import com.example.PaymentProcessing.model.GroupSplit;
import com.example.PaymentProcessing.model.GroupSplitMember;
import com.example.PaymentProcessing.model.GroupSplitType;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.CustomerRepository;
import com.example.PaymentProcessing.repository.GroupSplitMemberRepository;
import com.example.PaymentProcessing.repository.GroupSplitRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupSplitService {

    private final GroupSplitRepository groupSplitRepository;
    private final GroupSplitMemberRepository groupSplitMemberRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final PaymentService paymentService;

    public GroupSplitService(
            GroupSplitRepository groupSplitRepository,
            GroupSplitMemberRepository groupSplitMemberRepository,
            AccountRepository accountRepository,
            CustomerRepository customerRepository,
            PaymentService paymentService) {
        this.groupSplitRepository = groupSplitRepository;
        this.groupSplitMemberRepository = groupSplitMemberRepository;
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.paymentService = paymentService;
    }

    @Transactional
    public GroupSplitResponse createGroupSplit(CreateGroupSplitRequest request, Long creatorCustomerId) {
        validate(request);

        GroupSplitType splitType = request.getSplitType();
        BigDecimal totalAmount = request.getAmount();
        List<GroupSplitMemberRequest> memberRequests = request.getMembers();

        // Resolve each member's account up front, so a bad account number fails
        // before anything is written.
        List<Account> resolvedAccounts = new ArrayList<>();
        for (GroupSplitMemberRequest memberRequest : memberRequests) {
            Account account = accountRepository.findByAccountNumber(memberRequest.getAccountNumber())
                    .orElseThrow(() -> new ApiException(
                            "ACCOUNT_NOT_FOUND",
                            "No account found for account number " + memberRequest.getAccountNumber(),
                            HttpStatus.BAD_REQUEST));
            resolvedAccounts.add(account);
        }

        List<BigDecimal> shareAmounts = computeShares(splitType, totalAmount, memberRequests);

        // Members settle by paying into this account, so fall back to the
        // creator's own account when the request didn't specify one.
        Long sourceAccountId = request.getSourceAccountId();
        if (sourceAccountId == null) {
            sourceAccountId = accountRepository.findFirstByCustomerId(creatorCustomerId)
                    .map(Account::getAccountId)
                    .orElse(null);
        }

        GroupSplit groupSplit = new GroupSplit();
        groupSplit.setCreatedByCustomerId(creatorCustomerId);
        groupSplit.setSourceAccountId(sourceAccountId);
        groupSplit.setTotalAmount(totalAmount);
        groupSplit.setCurrency((request.getCurrency() == null || request.getCurrency().isBlank())
                ? "INR" : request.getCurrency().toUpperCase());
        groupSplit.setDescription(request.getDescription());
        groupSplit.setSplitType(splitType);
        groupSplit.setReferenceNumber("SPLIT-" + UUID.randomUUID());

        GroupSplit savedSplit = groupSplitRepository.save(groupSplit);

        List<GroupSplitMemberResponse> memberResponses = new ArrayList<>();
        for (int i = 0; i < memberRequests.size(); i++) {
            Account account = resolvedAccounts.get(i);

            GroupSplitMember member = new GroupSplitMember();
            member.setGroupSplitId(savedSplit.getGroupSplitId());
            member.setAccountId(account.getAccountId());
            member.setAccountNumber(account.getAccountNumber());
            member.setCustomerId(account.getCustomerId());
            member.setShareAmount(shareAmounts.get(i));
            member.setSeen(false);
            groupSplitMemberRepository.save(member);

            memberResponses.add(GroupSplitMemberResponse.of(
                    account.getAccountNumber(), account.getAccountHolderName(), shareAmounts.get(i), false, false));
        }

        return GroupSplitResponse.fromEntity(savedSplit, memberResponses);
    }

    /**
     * Returns pending group-split notifications for a customer and marks them
     * seen in the same call — this is what the dashboard hits right after
     * login so each person only gets notified once.
     */
    @Transactional
    public List<GroupSplitNotificationResponse> fetchAndAcknowledgeNotifications(Long customerId) {
        List<GroupSplitMember> pending = groupSplitMemberRepository.findByCustomerIdAndSeenFalse(customerId);
        List<GroupSplitNotificationResponse> notifications = new ArrayList<>();

        for (GroupSplitMember member : pending) {
            GroupSplit split = groupSplitRepository.findById(member.getGroupSplitId()).orElse(null);
            if (split == null) {
                continue;
            }
            String creatorName = customerRepository.findById(split.getCreatedByCustomerId())
                    .map(this::displayName)
                    .orElse("A Tallyn user");

            notifications.add(GroupSplitNotificationResponse.of(
                    split.getGroupSplitId(),
                    split.getDescription(),
                    split.getTotalAmount(),
                    member.getShareAmount(),
                    split.getCurrency(),
                    creatorName,
                    split.getCreatedAt(),
                    false,
                    member.isPaid()));

            member.setSeen(true);
            groupSplitMemberRepository.save(member);
        }

        return notifications;
    }

    /**
     * Returns every group split a customer is a member of (persisted view,
     * not toast/one-shot) without mutating the seen flag. This is what the
     * dashboard's group-split history list reads from, so a member can
     * always come back and see splits they were added to.
     */
    @Transactional(readOnly = true)
    public List<GroupSplitNotificationResponse> getMySplits(Long customerId) {
        List<GroupSplitMember> memberships = groupSplitMemberRepository.findByCustomerIdOrderByGroupSplitMemberIdDesc(customerId);
        List<GroupSplitNotificationResponse> splits = new ArrayList<>();

        for (GroupSplitMember member : memberships) {
            GroupSplit split = groupSplitRepository.findById(member.getGroupSplitId()).orElse(null);
            if (split == null) {
                continue;
            }
            String creatorName = customerRepository.findById(split.getCreatedByCustomerId())
                    .map(this::displayName)
                    .orElse("A Tallyn user");

            splits.add(GroupSplitNotificationResponse.of(
                    split.getGroupSplitId(),
                    split.getDescription(),
                    split.getTotalAmount(),
                    member.getShareAmount(),
                    split.getCurrency(),
                    creatorName,
                    split.getCreatedAt(),
                    member.isSeen(),
                    member.isPaid()));
        }

        return splits;
    }

    /**
     * Splits the customer created, with each member's paid/seen status —
     * the creator's "view and track settlement" screen.
     */
    @Transactional(readOnly = true)
    public List<GroupSplitResponse> getCreatedSplits(Long customerId) {
        List<GroupSplit> created = groupSplitRepository.findByCreatedByCustomerIdOrderByGroupSplitIdDesc(customerId);
        List<GroupSplitResponse> responses = new ArrayList<>();

        for (GroupSplit split : created) {
            List<GroupSplitMemberResponse> memberResponses = new ArrayList<>();
            for (GroupSplitMember member : groupSplitMemberRepository.findByGroupSplitId(split.getGroupSplitId())) {
                memberResponses.add(GroupSplitMemberResponse.of(
                        member.getAccountNumber(),
                        accountRepository.findById(member.getAccountId()).map(Account::getAccountHolderName).orElse(null),
                        member.getShareAmount(),
                        member.isSeen(),
                        member.isPaid()));
            }
            responses.add(GroupSplitResponse.fromEntity(split, memberResponses));
        }

        return responses;
    }

    /**
     * Lets a member settle their own share — creates a real payment from
     * their account into the split's source account and marks their
     * membership row paid.
     */
    @Transactional
    public GroupSplitNotificationResponse paySplitShare(Long groupSplitId, Long customerId, String tpin) {
        GroupSplitMember member = groupSplitMemberRepository.findByGroupSplitIdAndCustomerId(groupSplitId, customerId)
                .orElseThrow(() -> new ApiException(
                        "NOT_A_MEMBER", "You are not part of this split", HttpStatus.FORBIDDEN));

        if (member.isPaid()) {
            throw new ApiException("ALREADY_PAID", "You've already settled your share of this split", HttpStatus.CONFLICT);
        }

        GroupSplit split = groupSplitRepository.findById(groupSplitId)
                .orElseThrow(() -> new ApiException("SPLIT_NOT_FOUND", "Split not found", HttpStatus.NOT_FOUND));

        if (split.getSourceAccountId() == null) {
            throw new ApiException(
                    "NO_DESTINATION_ACCOUNT", "This split has no destination account to settle into", HttpStatus.CONFLICT);
        }

        CreatePaymentRequest paymentRequest = new CreatePaymentRequest();
        paymentRequest.setSourceAccountId(member.getAccountId());
        paymentRequest.setDestinationAccountId(split.getSourceAccountId());
        paymentRequest.setAmount(member.getShareAmount());
        paymentRequest.setCurrency(split.getCurrency());
        paymentRequest.setReferenceNumber("SPLIT-PAY-" + UUID.randomUUID());
        paymentRequest.setRemarks("Settling split: " + split.getDescription());
        paymentRequest.setTpin(tpin);

        paymentService.createPayment(paymentRequest, customerId);

        member.setPaid(true);
        member.setSeen(true);
        groupSplitMemberRepository.save(member);

        String creatorName = customerRepository.findById(split.getCreatedByCustomerId())
                .map(this::displayName)
                .orElse("A Tallyn user");

        return GroupSplitNotificationResponse.of(
                split.getGroupSplitId(),
                split.getDescription(),
                split.getTotalAmount(),
                member.getShareAmount(),
                split.getCurrency(),
                creatorName,
                split.getCreatedAt(),
                true,
                true);
    }

    private String displayName(Customer customer) {
        String name = String.join(" ",
                customer.getFirstName() == null ? "" : customer.getFirstName(),
                customer.getLastName() == null ? "" : customer.getLastName()).trim();
        return name.isEmpty() ? customer.getEmail() : name;
    }

    private void validate(CreateGroupSplitRequest request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException("INVALID_AMOUNT", "Total amount must be greater than zero", HttpStatus.BAD_REQUEST);
        }
        if (request.getDescription() == null || request.getDescription().isBlank()) {
            throw new ApiException("INVALID_DESCRIPTION", "Description is required", HttpStatus.BAD_REQUEST);
        }
        if (request.getSplitType() == null) {
            throw new ApiException("INVALID_SPLIT_TYPE", "Split type must be EQUAL or UNEQUAL", HttpStatus.BAD_REQUEST);
        }
        if (request.getMembers() == null || request.getMembers().isEmpty()) {
            throw new ApiException("MEMBERS_REQUIRED", "At least one member account is required", HttpStatus.BAD_REQUEST);
        }
        for (GroupSplitMemberRequest member : request.getMembers()) {
            if (member.getAccountNumber() == null || member.getAccountNumber().isBlank()) {
                throw new ApiException("INVALID_MEMBER", "Every member must have an account number", HttpStatus.BAD_REQUEST);
            }
        }
        if (request.getSplitType() == GroupSplitType.UNEQUAL) {
            for (GroupSplitMemberRequest member : request.getMembers()) {
                if (member.getAmount() == null || member.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ApiException(
                            "INVALID_MEMBER_AMOUNT",
                            "Each member needs a positive amount for an unequal split",
                            HttpStatus.BAD_REQUEST);
                }
            }
            BigDecimal sum = request.getMembers().stream()
                    .map(GroupSplitMemberRequest::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sum.setScale(2, RoundingMode.HALF_UP).compareTo(request.getAmount().setScale(2, RoundingMode.HALF_UP)) != 0) {
                throw new ApiException(
                        "SPLIT_AMOUNT_MISMATCH",
                        "Member amounts must add up to the total amount",
                        HttpStatus.BAD_REQUEST);
            }
        }
    }

    private List<BigDecimal> computeShares(GroupSplitType splitType, BigDecimal totalAmount, List<GroupSplitMemberRequest> members) {
        List<BigDecimal> shares = new ArrayList<>();

        if (splitType == GroupSplitType.UNEQUAL) {
            for (GroupSplitMemberRequest member : members) {
                shares.add(member.getAmount().setScale(2, RoundingMode.HALF_UP));
            }
            return shares;
        }

        // EQUAL: divide evenly and push any rounding remainder onto the last
        // member so the shares always sum exactly to the total.
        int count = members.size();
        BigDecimal baseShare = totalAmount.divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
        BigDecimal allocated = baseShare.multiply(BigDecimal.valueOf(count));
        BigDecimal remainder = totalAmount.subtract(allocated);

        for (int i = 0; i < count; i++) {
            shares.add(i == count - 1 ? baseShare.add(remainder) : baseShare);
        }
        return shares;
    }
}