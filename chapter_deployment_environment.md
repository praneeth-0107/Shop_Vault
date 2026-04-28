# DEPLOYMENT ENVIRONMENT

The ShopVault E-Commerce System operates within a multi-tier architecture comprising a client-side interface, an application server, and a database backend. The following components constitute the deployment environment of the system.

---

## 1. Web Browser (Chrome / Firefox / Microsoft Edge / Safari)

The customers and the administrators use the **Web Browser** to access the e-commerce system. It acts as the client-side front-end that renders the HTML pages, executes JavaScript-based interactions, and communicates with the backend server through HTTP/HTTPS requests. No additional software or plugin installation is required on the client side — the entire application is accessible through a standard modern web browser.

---

## 2. Web Server (Express.js over Node.js HTTP Server)

The **Web Server** is responsible for deploying and hosting the e-commerce application and handling all HTTP requests sent by the clients. In this project, the **Express.js** framework (built on top of the Node.js HTTP module) is used as the web server. It serves the static HTML, CSS, and JavaScript files to the browser, routes incoming API requests to the appropriate controllers, and returns JSON responses to the client. The server listens on **Port 5000** during development and is deployable on cloud platforms such as **Vercel** and **Railway** for production use.

---

## 3. Backend Technology (Node.js)

**Node.js** is the server-side runtime environment utilized to execute business logic, process API requests, handle user authentication, manage order processing, and communicate with the database. It provides a non-blocking, event-driven architecture that allows efficient handling of multiple concurrent client requests. The key backend packages used are:

| S.No | Package | Purpose |
|:----:|---------|---------|
| 1. | **Express.js** (v4.21) | Web application framework for routing and middleware |
| 2. | **bcryptjs** (v2.4) | Password hashing and encryption for secure authentication |
| 3. | **jsonwebtoken** (v9.0) | JWT-based token generation for stateless user authentication |
| 4. | **dotenv** (v16.4) | Loading environment variables from `.env` configuration file |
| 5. | **cors** (v2.8) | Enabling Cross-Origin Resource Sharing for API access |
| 6. | **razorpay** (v2.9) | Razorpay SDK for payment gateway integration |
| 7. | **nodemailer** (v8.0) | Sending transactional emails (OTP, password reset, order confirmation) |
| 8. | **better-sqlite3** (v11.6) | High-performance SQLite3 database driver for Node.js |

---

## 4. Database Server (SQLite / MySQL)

The **Database Server** is used for managing and storing all application data including customer information, product details, shopping cart records, orders, payments, and admin data. In the current implementation, **SQLite** (via the `better-sqlite3` driver) is used as the embedded relational database, which stores data in a local file (`ecommerce.db`). For production-scale deployment, the system can be migrated to **MySQL** for enhanced concurrency, scalability, and multi-user support. The database contains the following core tables:

| S.No | Table Name | Description |
|:----:|------------|-------------|
| 1. | `admins` | Stores administrator credentials and profile information |
| 2. | `customers` | Stores registered customer details (name, email, address, etc.) |
| 3. | `products` | Stores product catalog (name, category, price, stock, description) |
| 4. | `cart` | Stores shopping cart entries linked to customers and products |
| 5. | `orders` | Stores placed orders with status, address, and total amount |
| 6. | `order_items` | Stores individual items within each order |
| 7. | `payments` | Stores payment transaction records (Razorpay IDs, status, amount) |

---

## 5. Operating System (Windows / Linux / macOS)

The **Operating System** is the platform on which the web server and database server are executed. The ShopVault system is cross-platform compatible and can be deployed on:

- **Windows 10/11** — Primary development environment
- **Linux (Ubuntu / CentOS)** — Preferred for cloud-based production servers
- **macOS** — Supported for development and testing

The Node.js runtime and SQLite database operate identically across all three platforms, ensuring seamless portability without any code modifications.

---

## 6. Payment Gateway API (Razorpay)

**Razorpay** is the payment processing API integrated into the ShopVault system to enable secure online financial transactions. It handles encrypted payment processing, supports multiple payment methods (UPI, Debit/Credit Cards, Net Banking, Wallets), and provides real-time payment status verification. The integration works as follows:

1. The server creates a **Razorpay Order** using the Razorpay SDK with the order amount and currency.
2. The client-side Razorpay Checkout widget is launched in the browser for the customer to complete payment.
3. Upon successful payment, Razorpay sends a **payment signature** which is verified on the server using HMAC-SHA256 cryptographic validation.
4. The verified payment details (Razorpay Order ID, Payment ID, and Signature) are stored in the `payments` table of the database.

This ensures end-to-end encryption, PCI-DSS compliance, and high-security standards for all financial transactions processed through the system.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │  Chrome   │  │  Firefox  │  │   Edge    │  │  Safari   │       │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │
│        └───────────────┴───────────────┴───────────────┘            │
│                         HTTP / HTTPS                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     APPLICATION TIER                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Node.js + Express.js Server                  │      │
│  │                    (Port 5000)                             │      │
│  │                                                           │      │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │      │
│  │  │   Auth     │  │  Product   │  │   Order / Payment  │  │      │
│  │  │  Routes    │  │  Routes    │  │      Routes        │  │      │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │      │
│  │                                                           │      │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │      │
│  │  │   Cart     │  │   Admin    │  │    Middleware       │  │      │
│  │  │  Routes    │  │  Routes    │  │  (JWT Auth, CORS)  │  │      │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│         OS: Windows / Linux / macOS                                 │
└──────────┬──────────────────────────────────┬───────────────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│      DATA TIER          │     │      EXTERNAL SERVICES          │
│                         │     │                                  │
│  ┌───────────────────┐  │     │  ┌───────────────────────────┐  │
│  │  SQLite / MySQL   │  │     │  │   Razorpay Payment API    │  │
│  │  (ecommerce.db)   │  │     │  │   (Payment Processing)    │  │
│  │                   │  │     │  └───────────────────────────┘  │
│  │  Tables:          │  │     │                                  │
│  │  • admins         │  │     │  ┌───────────────────────────┐  │
│  │  • customers      │  │     │  │   Nodemailer / SMTP       │  │
│  │  • products       │  │     │  │   (Email Service)         │  │
│  │  • cart           │  │     │  └───────────────────────────┘  │
│  │  • orders         │  │     │                                  │
│  │  • order_items    │  │     │                                  │
│  │  • payments       │  │     │                                  │
│  └───────────────────┘  │     │                                  │
└─────────────────────────┘     └──────────────────────────────────┘
```

---

## Hardware Requirements

| S.No | Component | Minimum Specification |
|:----:|-----------|----------------------|
| 1. | Processor | Intel Core i3 / AMD Ryzen 3 or above |
| 2. | RAM | 4 GB (8 GB recommended) |
| 3. | Hard Disk | 10 GB free space (SSD recommended) |
| 4. | Network | Stable Internet connection (for Razorpay & Email services) |
| 5. | Display | 1366 × 768 resolution or higher |

---

## Software Requirements

| S.No | Software | Version / Details |
|:----:|----------|-------------------|
| 1. | Operating System | Windows 10/11, Linux (Ubuntu 20.04+), or macOS 12+ |
| 2. | Node.js Runtime | v18.x or above |
| 3. | npm (Node Package Manager) | v9.x or above |
| 4. | Web Browser | Chrome 90+, Firefox 88+, Edge 90+, or Safari 14+ |
| 5. | Database | SQLite 3 (embedded) / MySQL 8.0 (production) |
| 6. | Text Editor / IDE | VS Code (recommended) |

---
