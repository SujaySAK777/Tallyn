package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.RefundRequest;
import com.example.PaymentProcessing.model.RefundRequestStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {
    List<RefundRequest> findByStatusOrderByCreatedAtAsc(RefundRequestStatus status);

    List<RefundRequest> findAllByOrderByCreatedAtAsc();

    List<RefundRequest> findByPayment_PaymentIdOrderByCreatedAtDesc(Long paymentId);

    List<RefundRequest> findByRequestedByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<RefundRequest> findByPayment_PaymentIdAndStatus(Long paymentId, RefundRequestStatus status);
}
