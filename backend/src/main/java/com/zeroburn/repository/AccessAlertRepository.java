package com.zeroburn.repository;

import com.zeroburn.entity.AccessAlertEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccessAlertRepository extends JpaRepository<AccessAlertEntity, Long> {

    List<AccessAlertEntity> findByCreatorTokenOrderByCreatedAtDesc(String creatorToken);

    List<AccessAlertEntity> findBySecretIdOrderByCreatedAtDesc(UUID secretId);

    boolean existsBySecretIdAndEventType(UUID secretId, String eventType);

    Optional<AccessAlertEntity> findFirstBySecretIdAndEventType(UUID secretId, String eventType);

    long deleteBySecretId(UUID secretId);
}
