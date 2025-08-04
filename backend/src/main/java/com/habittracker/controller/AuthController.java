package com.habittracker.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @GetMapping("/user")
    public ResponseEntity<?> getUser(HttpServletRequest request, HttpServletResponse response) {
        try {
            // Log della sessione e dei cookie
            HttpSession session = request.getSession(false);
            logger.info("Session ID: {}", session != null ? session.getId() : "no session");
            
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    logger.info("Received cookie: {} = {}", cookie.getName(), cookie.getValue());
                }
            } else {
                logger.warn("No cookies present in request");
            }
    
            // Log degli headers
            Collections.list(request.getHeaderNames()).forEach(headerName -> 
                logger.info("Header {}: {}", headerName, request.getHeader(headerName))
            );
    
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            logger.info("Authentication present: {}, type: {}", 
                auth != null, 
                auth != null ? auth.getClass().getSimpleName() : "null");
    
            if (auth != null && auth.getPrincipal() instanceof OAuth2User) {
                OAuth2User oauth2User = (OAuth2User) auth.getPrincipal();
                String email = oauth2User.getAttribute("email");
                logger.info("OAuth2User found with email: {}", email);
    
                Map<String, Object> userDetails = new HashMap<>();
                userDetails.put("name", oauth2User.getAttribute("name"));
                userDetails.put("picture", oauth2User.getAttribute("picture"));
                userDetails.put("email", email);
                userDetails.put("authenticated", true);
    
                // Assicuriamoci che gli header CORS siano presenti
                response.setHeader("Access-Control-Allow-Origin", "https://habit.cocchy.casa");
                response.setHeader("Access-Control-Allow-Credentials", "true");
    
                return ResponseEntity.ok(userDetails);
            }
    
            logger.warn("No authenticated user found in SecurityContext");
            return ResponseEntity.ok(Map.of("authenticated", false));
        } catch (Exception e) {
            logger.error("Error getting user details", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error retrieving user details"));
        }
    }    

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        try {
            logger.info("Processing logout request");

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                new SecurityContextLogoutHandler().logout(request, response, auth);
                logger.info("Logout successful for user: {}", auth.getName());
            }

            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
                logger.debug("Session invalidated");
            }

            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    cookie.setValue("");
                    cookie.setPath("/");
                    cookie.setMaxAge(0);
                    cookie.setSecure(true);
                    cookie.setHttpOnly(true);
                    response.addCookie(cookie);
                }
                logger.debug("Cookies cleared");
            }

            SecurityContextHolder.clearContext();
            logger.debug("Security context cleared");

            return ResponseEntity.ok()
                    .body(Map.of(
                            "message", "Logged out successfully",
                            "status", "success",
                            "redirectUrl", frontendUrl  // Aggiungi l'URL di redirect
                    ));

        } catch (Exception e) {
            logger.error("Error during logout", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "error", "Logout failed",
                            "message", e.getMessage(),
                            "redirectUrl", frontendUrl  // Anche in caso di errore, fornisci l'URL
                    ));
        }
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkAuthStatus() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAuthenticated = auth != null && auth.isAuthenticated() &&
                auth.getPrincipal() instanceof OAuth2User;

        return ResponseEntity.ok(Map.of("authenticated", isAuthenticated));
    }
}