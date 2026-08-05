package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.PaymentProcessing.api.CreateGroupSplitRequest;
import com.example.PaymentProcessing.api.CreatePaymentRequest;
import com.example.PaymentProcessing.api.GroupSplitMemberRequest;
import com.example.PaymentProcessing.api.GroupSplitNotificationResponse;
import com.example.PaymentProcessing.api.GroupSplitResponse;
import com.example.PaymentProcessing.api.PaymentResponse;
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
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class GroupSplitServiceTest {

    private GroupSplitRepository groupSplitRepository;
    private GroupSplitMemberRepository groupSplitMemberRepository;
    private AccountRepository accountRepository;
    private CustomerRepository customerRepository;
    private PaymentService paymentService;
    private CurrencyConversionService currencyConversionService;
    private GroupSplitService service;

    private void setUp() {
        groupSplitRepository = mock(GroupSplitRepository.class);
        groupSplitMemberRepository = mock(GroupSplitMemberRepository.class);
        accountRepository = mock(AccountRepository.class);
        customerRepository = mock(CustomerRepository.class);
        paymentService = mock(PaymentService.class);
        currencyConversionService = mock(CurrencyConversionService.class);
        service = new GroupSplitService(groupSplitRepository, groupSplitMemberRepository,
                accountRepository, customerRepository, paymentService, currencyConversionService);
    }

    private Account accountWithNumber(String number, Long id) {
        Account account = new Account();
        account.setAccountId(id);
        account.setAccountNumber(number);
        account.setAccountHolderName("Member " + number);
        account.setCurrency("INR");
        return account;
    }

    @Test
    void shouldSplitEquallyPushingRemainderOntoLastMember() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.TEN);
        request.setDescription("Dinner");
        request.setSplitType(GroupSplitType.EQUAL);
        request.setSourceAccountId(1L);

        GroupSplitMemberRequest m1 = new GroupSplitMemberRequest();
        m1.setAccountNumber("A1");
        GroupSplitMemberRequest m2 = new GroupSplitMemberRequest();
        m2.setAccountNumber("A2");
        GroupSplitMemberRequest m3 = new GroupSplitMemberRequest();
        m3.setAccountNumber("A3");
        request.setMembers(List.of(m1, m2, m3));

        when(accountRepository.findByAccountNumber("A1")).thenReturn(Optional.of(accountWithNumber("A1", 10L)));
        when(accountRepository.findByAccountNumber("A2")).thenReturn(Optional.of(accountWithNumber("A2", 11L)));
        when(accountRepository.findByAccountNumber("A3")).thenReturn(Optional.of(accountWithNumber("A3", 12L)));

        Account sourceAccount = accountWithNumber("SRC", 1L);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(sourceAccount));
        when(groupSplitRepository.save(any(GroupSplit.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GroupSplitResponse response = service.createGroupSplit(request, 99L);

        List<BigDecimal> shares = response.getMembers().stream().map(m -> m.getShareAmount()).toList();
        assertEquals(new BigDecimal("3.33"), shares.get(0));
        assertEquals(new BigDecimal("3.33"), shares.get(1));
        assertEquals(new BigDecimal("3.34"), shares.get(2));
        assertEquals(0, shares.stream().reduce(BigDecimal.ZERO, BigDecimal::add).compareTo(BigDecimal.TEN));
    }

    @Test
    void shouldUseExplicitAmountsForUnequalSplit() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.valueOf(100));
        request.setDescription("Trip");
        request.setSplitType(GroupSplitType.UNEQUAL);
        request.setSourceAccountId(1L);

        GroupSplitMemberRequest m1 = new GroupSplitMemberRequest();
        m1.setAccountNumber("A1");
        m1.setAmount(BigDecimal.valueOf(60));
        GroupSplitMemberRequest m2 = new GroupSplitMemberRequest();
        m2.setAccountNumber("A2");
        m2.setAmount(BigDecimal.valueOf(40));
        request.setMembers(List.of(m1, m2));

        when(accountRepository.findByAccountNumber("A1")).thenReturn(Optional.of(accountWithNumber("A1", 10L)));
        when(accountRepository.findByAccountNumber("A2")).thenReturn(Optional.of(accountWithNumber("A2", 11L)));
        when(accountRepository.findById(1L)).thenReturn(Optional.of(accountWithNumber("SRC", 1L)));
        when(groupSplitRepository.save(any(GroupSplit.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GroupSplitResponse response = service.createGroupSplit(request, 99L);

        assertEquals(new BigDecimal("60.00"), response.getMembers().get(0).getShareAmount());
        assertEquals(new BigDecimal("40.00"), response.getMembers().get(1).getShareAmount());
    }

    @Test
    void shouldRejectUnequalSplitWhoseAmountsDontMatchTotal() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.valueOf(100));
        request.setDescription("Trip");
        request.setSplitType(GroupSplitType.UNEQUAL);

        GroupSplitMemberRequest m1 = new GroupSplitMemberRequest();
        m1.setAccountNumber("A1");
        m1.setAmount(BigDecimal.valueOf(60));
        GroupSplitMemberRequest m2 = new GroupSplitMemberRequest();
        m2.setAccountNumber("A2");
        m2.setAmount(BigDecimal.valueOf(30)); // 60 + 30 != 100
        request.setMembers(List.of(m1, m2));

        ApiException ex = assertThrows(ApiException.class, () -> service.createGroupSplit(request, 99L));
        assertEquals("SPLIT_AMOUNT_MISMATCH", ex.getErrorCode());
    }

    @Test
    void shouldRejectZeroOrNegativeTotalAmount() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.ZERO);

        ApiException ex = assertThrows(ApiException.class, () -> service.createGroupSplit(request, 99L));
        assertEquals("INVALID_AMOUNT", ex.getErrorCode());
    }

    @Test
    void shouldRejectMissingDescription() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.TEN);
        request.setDescription("  ");

        ApiException ex = assertThrows(ApiException.class, () -> service.createGroupSplit(request, 99L));
        assertEquals("INVALID_DESCRIPTION", ex.getErrorCode());
    }

    @Test
    void shouldRejectMissingSplitType() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.TEN);
        request.setDescription("Dinner");

        ApiException ex = assertThrows(ApiException.class, () -> service.createGroupSplit(request, 99L));
        assertEquals("INVALID_SPLIT_TYPE", ex.getErrorCode());
    }

    @Test
    void shouldRejectEmptyMembersList() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.TEN);
        request.setDescription("Dinner");
        request.setSplitType(GroupSplitType.EQUAL);
        request.setMembers(List.of());

        ApiException ex = assertThrows(ApiException.class, () -> service.createGroupSplit(request, 99L));
        assertEquals("MEMBERS_REQUIRED", ex.getErrorCode());
    }

    @Test
    void shouldRejectUnknownMemberAccountNumber() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.TEN);
        request.setDescription("Dinner");
        request.setSplitType(GroupSplitType.EQUAL);
        GroupSplitMemberRequest m1 = new GroupSplitMemberRequest();
        m1.setAccountNumber("UNKNOWN");
        request.setMembers(List.of(m1));

        when(accountRepository.findByAccountNumber("UNKNOWN")).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.createGroupSplit(request, 99L));
        assertEquals("ACCOUNT_NOT_FOUND", ex.getErrorCode());
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void shouldFallBackToCreatorsFirstAccountWhenSourceAccountIdMissing() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.TEN);
        request.setDescription("Dinner");
        request.setSplitType(GroupSplitType.EQUAL);
        GroupSplitMemberRequest m1 = new GroupSplitMemberRequest();
        m1.setAccountNumber("A1");
        request.setMembers(List.of(m1));

        when(accountRepository.findByAccountNumber("A1")).thenReturn(Optional.of(accountWithNumber("A1", 10L)));
        Account creatorAccount = accountWithNumber("CREATOR", 5L);
        when(accountRepository.findFirstByCustomerId(99L)).thenReturn(Optional.of(creatorAccount));
        when(accountRepository.findById(5L)).thenReturn(Optional.of(creatorAccount));
        when(groupSplitRepository.save(any(GroupSplit.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.createGroupSplit(request, 99L);

        var captor = org.mockito.ArgumentCaptor.forClass(GroupSplit.class);
        verify(groupSplitRepository).save(captor.capture());
        assertEquals(5L, captor.getValue().getSourceAccountId());
    }

    @Test
    void shouldRejectWhenNoSourceAccountCanBeResolved() {
        setUp();
        CreateGroupSplitRequest request = new CreateGroupSplitRequest();
        request.setAmount(BigDecimal.TEN);
        request.setDescription("Dinner");
        request.setSplitType(GroupSplitType.EQUAL);
        GroupSplitMemberRequest m1 = new GroupSplitMemberRequest();
        m1.setAccountNumber("A1");
        request.setMembers(List.of(m1));

        when(accountRepository.findByAccountNumber("A1")).thenReturn(Optional.of(accountWithNumber("A1", 10L)));
        when(accountRepository.findFirstByCustomerId(99L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.createGroupSplit(request, 99L));
        assertEquals("INVALID_ACCOUNT", ex.getErrorCode());
    }

    @Test
    void shouldSkipOrphanedMembershipsWhenFetchingNotifications() {
        setUp();
        GroupSplitMember member = new GroupSplitMember();
        member.setGroupSplitId(1L);
        member.setCustomerId(1L);
        when(groupSplitMemberRepository.findByCustomerIdAndSeenFalse(1L)).thenReturn(List.of(member));
        when(groupSplitRepository.findById(1L)).thenReturn(Optional.empty());

        List<GroupSplitNotificationResponse> result = service.fetchAndAcknowledgeNotifications(1L);

        assertTrue(result.isEmpty());
    }

    @Test
    void shouldMarkNotificationsSeenAfterFetching() {
        setUp();
        GroupSplitMember member = new GroupSplitMember();
        member.setGroupSplitId(1L);
        member.setCustomerId(1L);
        member.setShareAmount(BigDecimal.TEN);
        member.setSeen(false);

        GroupSplit split = new GroupSplit();
        split.setGroupSplitId(1L);
        split.setCreatedByCustomerId(2L);
        split.setDescription("Dinner");
        split.setTotalAmount(BigDecimal.valueOf(30));
        split.setCurrency("INR");

        when(groupSplitMemberRepository.findByCustomerIdAndSeenFalse(1L)).thenReturn(List.of(member));
        when(groupSplitRepository.findById(1L)).thenReturn(Optional.of(split));
        when(customerRepository.findById(2L)).thenReturn(Optional.empty());

        List<GroupSplitNotificationResponse> result = service.fetchAndAcknowledgeNotifications(1L);

        assertEquals(1, result.size());
        assertEquals("A Tallyn user", result.get(0).getCreatedByName());
        assertTrue(member.isSeen());
        verify(groupSplitMemberRepository).save(member);
    }

    @Test
    void shouldUseCreatorDisplayNameWhenAvailable() {
        setUp();
        GroupSplitMember member = new GroupSplitMember();
        member.setGroupSplitId(1L);
        member.setCustomerId(1L);
        member.setShareAmount(BigDecimal.TEN);
        member.setSeen(true);
        member.setPaid(false);

        GroupSplit split = new GroupSplit();
        split.setGroupSplitId(1L);
        split.setCreatedByCustomerId(2L);
        split.setDescription("Dinner");
        split.setTotalAmount(BigDecimal.valueOf(30));
        split.setCurrency("INR");

        Customer creator = new Customer();
        creator.setFirstName("Jane");
        creator.setLastName("Doe");

        when(groupSplitMemberRepository.findByCustomerIdOrderByGroupSplitMemberIdDesc(1L)).thenReturn(List.of(member));
        when(groupSplitRepository.findById(1L)).thenReturn(Optional.of(split));
        when(customerRepository.findById(2L)).thenReturn(Optional.of(creator));

        List<GroupSplitNotificationResponse> result = service.getMySplits(1L);

        assertEquals("Jane Doe", result.get(0).getCreatedByName());
    }

    @Test
    void shouldPaySplitShareAndMarkMemberPaid() {
        setUp();
        GroupSplitMember member = new GroupSplitMember();
        member.setGroupSplitId(1L);
        member.setCustomerId(5L);
        member.setAccountId(10L);
        member.setShareAmount(BigDecimal.valueOf(25));
        member.setPaid(false);

        GroupSplit split = new GroupSplit();
        split.setGroupSplitId(1L);
        split.setSourceAccountId(1L);
        split.setCreatedByCustomerId(2L);
        split.setDescription("Dinner");
        split.setTotalAmount(BigDecimal.valueOf(100));
        split.setCurrency("INR");

        Account memberAccount = accountWithNumber("A1", 10L);

        when(groupSplitMemberRepository.findByGroupSplitIdAndCustomerId(1L, 5L)).thenReturn(Optional.of(member));
        when(groupSplitRepository.findById(1L)).thenReturn(Optional.of(split));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(memberAccount));
        when(currencyConversionService.convert(BigDecimal.valueOf(25), "INR", "INR")).thenReturn(BigDecimal.valueOf(25));
        when(paymentService.createPayment(any(CreatePaymentRequest.class), anyLong())).thenReturn(new PaymentResponse());
        when(customerRepository.findById(2L)).thenReturn(Optional.empty());

        GroupSplitNotificationResponse response = service.paySplitShare(1L, 5L, "123456");

        assertTrue(response.isPaid());
        assertTrue(member.isPaid());
        assertTrue(member.isSeen());
        verify(paymentService).createPayment(any(CreatePaymentRequest.class), anyLong());
    }

    @Test
    void shouldRejectPayingShareWhenNotAMember() {
        setUp();
        when(groupSplitMemberRepository.findByGroupSplitIdAndCustomerId(1L, 5L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.paySplitShare(1L, 5L, "123456"));
        assertEquals("NOT_A_MEMBER", ex.getErrorCode());
    }

    @Test
    void shouldRejectPayingShareTwice() {
        setUp();
        GroupSplitMember member = new GroupSplitMember();
        member.setPaid(true);
        when(groupSplitMemberRepository.findByGroupSplitIdAndCustomerId(1L, 5L)).thenReturn(Optional.of(member));

        ApiException ex = assertThrows(ApiException.class, () -> service.paySplitShare(1L, 5L, "123456"));
        assertEquals("ALREADY_PAID", ex.getErrorCode());
    }

    @Test
    void shouldRejectPayingShareWhenSplitMissing() {
        setUp();
        GroupSplitMember member = new GroupSplitMember();
        member.setPaid(false);
        when(groupSplitMemberRepository.findByGroupSplitIdAndCustomerId(1L, 5L)).thenReturn(Optional.of(member));
        when(groupSplitRepository.findById(1L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.paySplitShare(1L, 5L, "123456"));
        assertEquals("SPLIT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldRejectPayingShareWhenSplitHasNoDestinationAccount() {
        setUp();
        GroupSplitMember member = new GroupSplitMember();
        member.setPaid(false);
        GroupSplit split = new GroupSplit();
        split.setSourceAccountId(null);

        when(groupSplitMemberRepository.findByGroupSplitIdAndCustomerId(1L, 5L)).thenReturn(Optional.of(member));
        when(groupSplitRepository.findById(1L)).thenReturn(Optional.of(split));

        ApiException ex = assertThrows(ApiException.class, () -> service.paySplitShare(1L, 5L, "123456"));
        assertEquals("NO_DESTINATION_ACCOUNT", ex.getErrorCode());
    }

    @Test
    void shouldNotMarkMemberPaidWhenUnderlyingPaymentFails() {
        setUp();
        GroupSplitMember member = new GroupSplitMember();
        member.setGroupSplitId(1L);
        member.setCustomerId(5L);
        member.setAccountId(10L);
        member.setShareAmount(BigDecimal.valueOf(25));
        member.setPaid(false);

        GroupSplit split = new GroupSplit();
        split.setSourceAccountId(1L);
        split.setCurrency("INR");

        Account memberAccount = accountWithNumber("A1", 10L);

        when(groupSplitMemberRepository.findByGroupSplitIdAndCustomerId(1L, 5L)).thenReturn(Optional.of(member));
        when(groupSplitRepository.findById(1L)).thenReturn(Optional.of(split));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(memberAccount));
        when(currencyConversionService.convert(any(), any(), any())).thenReturn(BigDecimal.valueOf(25));
        when(paymentService.createPayment(any(CreatePaymentRequest.class), anyLong()))
                .thenThrow(new ApiException("INVALID_TPIN", "Incorrect TPIN", org.springframework.http.HttpStatus.UNAUTHORIZED));

        assertThrows(ApiException.class, () -> service.paySplitShare(1L, 5L, "000000"));
        assertTrue(!member.isPaid());
    }
}
