package com.phraiz.back.workspace.controller;

import com.phraiz.back.workspace.domain.WorkspaceItemType;
import com.phraiz.back.workspace.dto.WorkspaceDtos.*;
import com.phraiz.back.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v2/workspace")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping("/folders")
    public List<FolderResponse> listFolders(
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId
    ) {
        return workspaceService.listFolders(resolveMemberId(principal, headerMemberId));
    }

    @PostMapping("/folders")
    public FolderResponse createFolder(
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @Valid @RequestBody CreateFolderRequest request
    ) {
        return workspaceService.createFolder(resolveMemberId(principal, headerMemberId), request);
    }

    @DeleteMapping("/folders/{folderId}")
    public void deleteFolder(
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @PathVariable Long folderId
    ) {
        workspaceService.deleteFolder(resolveMemberId(principal, headerMemberId), folderId);
    }

    @GetMapping("/items")
    public List<ItemResponse> listItems(
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false) WorkspaceItemType type
    ) {
        return workspaceService.listItems(resolveMemberId(principal, headerMemberId), folderId, type);
    }

    @PostMapping("/items")
    public ItemResponse saveItem(
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @Valid @RequestBody SaveItemRequest request
    ) {
        return workspaceService.saveItem(resolveMemberId(principal, headerMemberId), request);
    }

    @PatchMapping("/items/{itemId}/move")
    public ItemResponse moveItem(
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @PathVariable Long itemId,
            @RequestBody MoveItemRequest request
    ) {
        return workspaceService.moveItem(resolveMemberId(principal, headerMemberId), itemId, request.targetFolderId());
    }

    @DeleteMapping("/items/{itemId}")
    public void deleteItem(
            Principal principal,
            @RequestHeader(value = "X-Member-Id", required = false) String headerMemberId,
            @PathVariable Long itemId
    ) {
        workspaceService.deleteItem(resolveMemberId(principal, headerMemberId), itemId);
    }

    private String resolveMemberId(Principal principal, String headerMemberId) {
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }
        return (headerMemberId != null && !headerMemberId.isBlank()) ? headerMemberId : "local-dev";
    }
}
