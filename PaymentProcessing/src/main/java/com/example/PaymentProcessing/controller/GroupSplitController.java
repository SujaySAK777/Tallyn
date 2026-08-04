package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.CreateGroupSplitRequest;
import com.example.PaymentProcessing.api.GroupSplitNotificationResponse;
import com.example.PaymentProcessing.api.GroupSplitResponse;
import com.example.PaymentProcessing.service.GroupSplitService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/group-splits")
public class GroupSplitController {

    private final GroupSplitService groupSplitService;

    public GroupSplitController(GroupSplitService groupSplitService) {
        this.groupSplitService = groupSplitService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupSplitResponse create(@RequestBody CreateGroupSplitRequest request,
            @RequestAttribute("customerId") Long customerId) {
        return groupSplitService.createGroupSplit(request, customerId);
    }

    @GetMapping("/notifications")
    public List<GroupSplitNotificationResponse> notifications(@RequestAttribute("customerId") Long customerId) {
        return groupSplitService.fetchAndAcknowledgeNotifications(customerId);
    }
}