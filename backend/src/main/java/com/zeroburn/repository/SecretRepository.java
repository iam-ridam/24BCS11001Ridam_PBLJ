package com.zeroburn.repository;

import com.zeroburn.entity.SecretEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SecretRepository extends JpaRepository<SecretEntity, UUID> {

    List<SecretEntity> findByCreatorTokenOrderByCreatedAtDesc(String creatorToken);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SecretEntity s WHERE s.id = :id")
    Optional<SecretEntity> findByIdForUpdate(@Param("id") UUID id);

    @Modifying
    @Query("DELETE FROM SecretEntity s WHERE s.expiresAt <= :now")
    int deleteExpiredSecrets(@Param("now") Instant now);

    @Query("SELECT s FROM SecretEntity s WHERE s.expiresAt <= :now")
    List<SecretEntity> findExpiredSecrets(@Param("now") Instant now);

    long countById(UUID id);
}
