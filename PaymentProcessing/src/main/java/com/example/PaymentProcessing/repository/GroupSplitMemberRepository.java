package com.example.PaymentProcessing.repository;

import com.example.PaymentProcessing.model.GroupSplitMember;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupSplitMemberRepository extends JpaRepository<GroupSplitMember, Long> {
    List<GroupSplitMember> findByGroupSplitId(Long groupSplitId);
    List<GroupSplitMember> findByCustomerIdAndSeenFalse(Long customerId);
    List<GroupSplitMember> findByCustomerIdOrderByGroupSplitMemberIdDesc(Long customerId);
    java.util.Optional<GroupSplitMember> findByGroupSplitIdAndCustomerId(Long groupSplitId, Long customerId);
}