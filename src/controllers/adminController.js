const adminService = require('../services/adminService');

const getDashboardStats = async (req, res) => {
  try {
    const result = await adminService.getDashboardStats();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Account Controllers
 */
const getAccounts = async (req, res) => {
  try {
    const result = await adminService.getAccounts();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAccount = async (req, res) => {
  try {
    const result = await adminService.createAccount(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAccount = async (req, res) => {
  try {
    const result = await adminService.updateAccount(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const result = await adminService.deleteAccount(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Career Controllers
 */
const getCareers = async (req, res) => {
  try {
    const result = await adminService.getCareers();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCareer = async (req, res) => {
  try {
    const result = await adminService.createCareer(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCareer = async (req, res) => {
  try {
    const result = await adminService.updateCareer(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCareer = async (req, res) => {
  try {
    const result = await adminService.deleteCareer(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Category Controllers
 */
const getCategories = async (req, res) => {
  try {
    const result = await adminService.getCategories();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const result = await adminService.createCategory(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const result = await adminService.updateCategory(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const result = await adminService.deleteCategory(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Market Data Controllers
 */
const getMarketData = async (req, res) => {
  try {
    const result = await adminService.getMarketData();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createMarketData = async (req, res) => {
  try {
    const result = await adminService.createMarketData(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateMarketData = async (req, res) => {
  try {
    const result = await adminService.updateMarketData(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteMarketData = async (req, res) => {
  try {
    const result = await adminService.deleteMarketData(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Prompt Controllers
 */
const getPrompts = async (req, res) => {
  try {
    const result = await adminService.getPrompts();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPrompt = async (req, res) => {
  try {
    const result = await adminService.createPrompt(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePrompt = async (req, res) => {
  try {
    const result = await adminService.updatePrompt(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePrompt = async (req, res) => {
  try {
    const result = await adminService.deletePrompt(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Question Controllers
 */
const getQuestions = async (req, res) => {
  try {
    const result = await adminService.getQuestions();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createQuestion = async (req, res) => {
  try {
    const result = await adminService.createQuestion(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const result = await adminService.updateQuestion(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const result = await adminService.deleteQuestion(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getCareers,
  createCareer,
  updateCareer,
  deleteCareer,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMarketData,
  createMarketData,
  updateMarketData,
  deleteMarketData,
  getPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
};
