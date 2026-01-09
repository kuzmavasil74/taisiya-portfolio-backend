import User from '../models/User.js'
export const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'name, email, password — required' })
    }

    const user = await User.create({ name, email, password })

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'User already exists' })
    }
    return res.status(500).json({ message: 'Server error' })
  }
}
export const getUsers = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'userId',
          as: 'bookings',
        },
      },
      {
        $addFields: {
          bookingsCount: { $size: '$bookings' },
        },
      },
      {
        $project: {
          password: 0,
          bookings: 0,
        },
      },
    ])
    return res.status(200).json(users)
  } catch (err) {
    return res.status(500).json({ message: 'Server error' })
  }
}
export const getUsersById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    } else if (
      req.user.role !== 'admin' &&
      req.user.id !== user._id.toString()
    ) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    return res.status(200).json(user)
  } catch (err) {
    return res.status(500).json({ message: 'Server error' })
  }
}
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    const { name, email, password } = req.body
    if (name) {
      user.name = name
    }
    if (email) {
      user.email = email
    }
    if (password) {
      user.password = password
    }
    await user.save()
    return res.status(200).json(user)
  } catch (err) {
    return res.status(500).json({ message: 'Server error' })
  }
}
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    await User.findByIdAndDelete(req.params.id)
    return res.status(200).json({ message: 'User deleted' })
  } catch (err) {
    return res.status(500).json({ message: 'Server error' })
  }
}
