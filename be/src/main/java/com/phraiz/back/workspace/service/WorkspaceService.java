package com.phraiz.back.workspace.service;

import com.phraiz.back.workspace.domain.WorkspaceFolder;
import com.phraiz.back.workspace.domain.WorkspaceItem;
import com.phraiz.back.workspace.domain.WorkspaceItemType;
import com.phraiz.back.workspace.dto.WorkspaceDtos.*;
import com.phraiz.back.workspace.repository.WorkspaceFolderRepository;
import com.phraiz.back.workspace.repository.WorkspaceItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class WorkspaceService {

    private final WorkspaceFolderRepository folderRepository;
    private final WorkspaceItemRepository itemRepository;

    public WorkspaceService(
            WorkspaceFolderRepository folderRepository,
            WorkspaceItemRepository itemRepository
    ) {
        this.folderRepository = folderRepository;
        this.itemRepository = itemRepository;
    }

    public List<FolderResponse> listFolders(String memberId) {
        return folderRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(f -> FolderResponse.from(f, itemRepository.countByFolderId(f.getId())))
                .toList();
    }

    @Transactional
    public FolderResponse createFolder(String memberId, CreateFolderRequest req) {
        WorkspaceFolder saved = folderRepository.save(new WorkspaceFolder(memberId, req.name().trim()));
        return FolderResponse.from(saved, 0);
    }

    @Transactional
    public void deleteFolder(String memberId, Long folderId) {
        WorkspaceFolder folder = folderRepository.findByIdAndMemberId(folderId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "폴더를 찾을 수 없습니다."));
        itemRepository.deleteByFolderId(folder.getId());
        folderRepository.delete(folder);
    }

    public List<ItemResponse> listItems(String memberId, Long folderId, WorkspaceItemType type) {
        List<WorkspaceItem> items;
        if (folderId != null && type != null) {
            items = itemRepository.findByMemberIdAndFolderIdAndItemTypeOrderByCreatedAtDesc(memberId, folderId, type);
        } else if (folderId != null) {
            items = itemRepository.findByMemberIdAndFolderIdOrderByCreatedAtDesc(memberId, folderId);
        } else if (type != null) {
            items = itemRepository.findByMemberIdAndItemTypeOrderByCreatedAtDesc(memberId, type);
        } else {
            items = itemRepository.findByMemberIdOrderByCreatedAtDesc(memberId);
        }
        return items.stream().map(ItemResponse::from).toList();
    }

    @Transactional
    public ItemResponse saveItem(String memberId, SaveItemRequest req) {
        WorkspaceFolder folder = null;
        if (req.folderId() != null) {
            folder = folderRepository.findByIdAndMemberId(req.folderId(), memberId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "지정한 폴더를 찾을 수 없습니다."));
        }
        WorkspaceItem saved = itemRepository.save(new WorkspaceItem(
                folder,
                memberId,
                req.itemType(),
                req.title().trim(),
                req.inputPayload(),
                req.outputPayload(),
                req.modelUsed(),
                req.tokensUsed()
        ));
        return ItemResponse.from(saved);
    }

    @Transactional
    public ItemResponse moveItem(String memberId, Long itemId, Long targetFolderId) {
        WorkspaceItem item = itemRepository.findByIdAndMemberId(itemId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "작업물을 찾을 수 없습니다."));
        WorkspaceFolder target = null;
        if (targetFolderId != null) {
            target = folderRepository.findByIdAndMemberId(targetFolderId, memberId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "이동할 폴더를 찾을 수 없습니다."));
        }
        item.moveToFolder(target);
        return ItemResponse.from(item);
    }

    @Transactional
    public void deleteItem(String memberId, Long itemId) {
        WorkspaceItem item = itemRepository.findByIdAndMemberId(itemId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "작업물을 찾을 수 없습니다."));
        itemRepository.delete(item);
    }
}
